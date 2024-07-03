import { memoryApi, supabase, userApi } from '#api'
import { Memory, User } from '#domain'
import { Maybe, q, updateCurrentUserChip } from '#utils'

const urlParams = new URLSearchParams(location.search)
const memoryId = <Maybe<Memory['id']>>urlParams.get('id')

if (!memoryId) {
    throw new Error('Memory id not found')
}

type OnlineCollaborator = {
    id: User['id']
    avatar: User['avatarSrc']
    name: User['firstName']
}

userApi
    .getCurrent()
    .then(async user => {
        if (!user) return

        updateCurrentUserChip(user)

        const memory = await memoryApi.get(memoryId, user.id)
        if (!memory) return

        new Collaboration(user, memoryId)

        q('[data-memory="title"]').innerHTML = memory.title

        // const cover = storageApi.getFileUrl(`memory/${memoryId}/cover`)

        // 一時的にコメントアウトする
        // const input = q<HTMLInputElement>('#file-input')
        // input.addEventListener('change', () => {
        //     const cover = input.files?.[0]

        //     if (!cover) return

        //     void memoryApi.uploadCover(memoryId, cover)
        // })

        // const deleteButton = q('#delete-file')
        // deleteButton.addEventListener('click', () => memoryApi.deleteCover(memoryId))

        // Create UI for Sticker List Modal
        const stickers = [
            'airplane',
            'beach-ball',
            'camera',
            'coconut-palm-tree',
            'glasses',
            'globe',
            'heart-heart',
            'heart',
            'i-love-you',
            'juice',
            'leaf',
            'love-love-love-love',
            'love',
            'parasol',
            'pencil',
            'present',
            'shell',
            'ship',
            'sparkle',
            'starfish',
            'straw-hat',
            'suitcase',
            'sun',
            'sunglasses',
            'tropical-juice',
            'yacht'
        ]
        function renderStickers(): void {
            const container = q('#sticker')
            stickers.forEach(id => {
                const img = document.createElement('img')
                img.id = id
                img.src = `/sticker/${id}.svg`
                img.alt = id
                container.appendChild(img)
            })
        }
        renderStickers()

        // Update Sticker
        let clickedStickerId: Maybe<string>
        const stickerSection = q('#sticker')
        stickerSection.addEventListener('click', (event: MouseEvent) => {
            const elem = event.target as HTMLElement
            if (elem.id === 'sticker') return
            clickedStickerId = elem.id
        })

        const saveStickerButton = q('#save-sticker-btn')
        saveStickerButton.addEventListener('click', async () => {
            await memoryApi.update(memoryId, { stickerId: clickedStickerId })
        })

        // Delete Sticker
        const deleteStickerButton = q('#delete-sticker-btn')
        deleteStickerButton.addEventListener('click', async () => {
            await memoryApi.update(memory.id, { stickerId: null })
        })
    })
    .catch(console.error)

class Collaboration {
    private readonly collaborators = new Map<User['id'], OnlineCollaborator>()
    private readonly list: HTMLUListElement
    private readonly listWrapper: HTMLDivElement
    private readonly template: HTMLTemplateElement
    private readonly currentUserId: User['id']

    public constructor(currentUser: User, memoryId: Memory['id']) {
        this.currentUserId = currentUser.id
        this.listWrapper = q('#online-collaborators')
        this.list = q<HTMLUListElement>('#collaborator-list', this.listWrapper)
        this.template = q<HTMLTemplateElement>('#collaborator-avatar', this.list)

        const room = supabase.channel(memoryId)

        room.on('presence', { event: 'sync' }, () => {
            const state = room.presenceState<OnlineCollaborator>()

            for (const key in state) {
                if (!Object.prototype.hasOwnProperty.call(state, key)) {
                    continue
                }

                state[key].forEach(collaborator => this.add(collaborator))
            }
        })
            .on<OnlineCollaborator>('presence', { event: 'join' }, ({ newPresences }) => {
                newPresences.forEach(collaborator => this.add(collaborator))
            })
            .on<OnlineCollaborator>('presence', { event: 'leave' }, ({ leftPresences }) => {
                leftPresences.forEach(collaborator => this.remove(collaborator.id))
            })
            .subscribe(status => {
                if (status !== 'SUBSCRIBED') {
                    return
                }

                room.presenceState()

                void room.track({
                    id: currentUser.id,
                    name: currentUser.firstName,
                    avatar: currentUser.avatarSrc
                } satisfies OnlineCollaborator)
            })
    }

    public add(collaborator: OnlineCollaborator): void {
        if (collaborator.id === this.currentUserId || this.collaborators.has(collaborator.id)) return

        const collaboratorElem = this.template.content.cloneNode(true) as HTMLElement

        const avatar = q<HTMLImageElement>('[data-collaborator=avatar]', collaboratorElem)
        q('[data-collaborator=initials]', collaboratorElem).innerHTML = collaborator.name.slice(0, 1)
        avatar.src = collaborator.avatar || ''
        avatar.onload = (): void => {
            avatar.classList.toggle('hidden')
        }

        collaboratorElem.firstElementChild!.id = `id${collaborator.id}`
        ;(collaboratorElem.firstElementChild as HTMLLIElement).title = collaborator.name

        this.list.appendChild(collaboratorElem)

        this.collaborators.set(collaborator.id, collaborator)
        this.sync()
    }

    public remove(id: OnlineCollaborator['id']): void {
        if (id === this.currentUserId) return

        this.collaborators.delete(id)
        this.list.removeChild(q(`#id${id}`, this.list))
        this.sync()
    }

    private sync(): void {
        if (this.collaborators.size !== 0) {
            this.listWrapper.style.display = 'flex'
            return
        }

        this.listWrapper.style.display = 'none'
    }
}
