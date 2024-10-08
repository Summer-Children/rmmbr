import { supabase } from '#api'
import { PagePath } from '#utils'

// exporting for unit testing
export function authStateGuard(): void {
    supabase.auth.onAuthStateChange((_, session) => {
        if (!session?.user) {
            window.location.href = PagePath.SignIn
            return
        }
    })
}

authStateGuard()
