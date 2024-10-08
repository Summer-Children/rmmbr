/**
 * type helper to produce unique string/number id fields
 */
export type ID<Base, Unique extends string> = Base & {
    __unique__: Unique
}

export type Location = [longitude: number, latitude: number]

export type Maybe<T> = T | undefined | null

export type PromiseMaybe<T> = Promise<Maybe<T>>
