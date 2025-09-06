'use client';

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Footer } from "../home/Footer";
import ChatbotWidget from "./ChatbotWidget";
import FloatingButtons from "./FloatingButtons";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export default function FooterAndFloatButtons() {
    const session = useSession();
    const pathname = usePathname();
    const [showCookieConsent, setShowCookieConsent] = useState(false);

    useEffect(() => {
        if (session.data?.user.role !== "admin" && typeof window !== "undefined") {
            const cookieConsent = localStorage.getItem('cookieConsent');
            if (cookieConsent === null) {
                setShowCookieConsent(true);
            }
        }
    }, [session]);

    const handleAcceptCookies = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setShowCookieConsent(false);
    };

    const handleRejectCookies = () => {
        setShowCookieConsent(false);
    };

    const hideFloatingButtons = pathname === "/book-appointment";

    if (session.data?.user.role === "patient") {
        return (
            <>
                {!hideFloatingButtons && <FloatingButtons />}
            </>
        );
    }

    if (session.status === "authenticated") {
        return null;
    }

    if(hideFloatingButtons) return null;

    return (
        <>
            <Footer />
            <FloatingButtons />
            <ChatbotWidget />
        </>
    );
}
