import { updateUserTimezone } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useEffect } from "react"

export const useTimeZone = () => {
    const session = useSession();
    const user = session?.data?.user;
     useEffect(()=>{
       updateUserTimezone(user?.timeZone);
     },[])
}