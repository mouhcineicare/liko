import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Header } from '@/components/shared/Header';
import { Toaster } from "@/components/ui/sonner";
import { AuthRedirect } from '@/components/auth/AuthRedirection';
import Script from 'next/script';
import FooterAndFloatButtons from '@/components/shared/FooterAndFloatButtons';
// import { initPayoutCron } from '@/lib/cron/payoutCron';

// Initialize cron jobs on server start
if (typeof window === 'undefined') {
  try {
    const { initPayoutCron } = require('@/lib/cron/payoutCron');
    const { runCron: initAppointmentCron } = require('@/app/api/cron/completeAppointments');
    
    // Initialize both cron jobs
    initPayoutCron();
    initAppointmentCron();
    
    console.log('✅ All cron jobs initialized');
  } catch (error) {
    console.warn('⚠️ Could not initialize cron jobs:', error);
  }
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Therapy Appointment System',
  description: 'Book online therapy sessions with licensed professionals',
};

// Define all your tracking IDs
const PRIMARY_GTM_ID = "GTM-WKZGHVHZ"; // Your existing GTM ID
const SECONDARY_GTM_ID = "GTM-W9RKDZ2D"; // New GTM ID to add
const GA_MEASUREMENT_ID = "G-PKEBDW5YQ1"; // Google Analytics ID
const FACEBOOK_PIXEL_ID = "1009445297559785"; // Facebook Pixel ID

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // if (process.env.NODE_ENV === 'production') {
    // initPayoutCron();
    // }
  return (
    <html lang="en">
      <head>
        <Script id="data-layer-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
          `}
        </Script>
        
        {/* AMP Analytics */}
        <script
          async
          custom-element="amp-analytics"
          src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"
        ></script>

        {/* Primary Google Tag Manager */}
        <Script id="gtm-primary" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${PRIMARY_GTM_ID}');
          `}
        </Script>

        {/* Secondary Google Tag Manager */}
        <Script id="gtm-secondary" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${SECONDARY_GTM_ID}');
          `}
        </Script>

        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>

        {/* Facebook Pixel */}
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FACEBOOK_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {/* Primary Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
            <iframe src="https://www.googletagmanager.com/ns.html?id=${PRIMARY_GTM_ID}"
            height="0" width="0" style="display:none;visibility:hidden"></iframe>
            `,
          }}
        />

        {/* Secondary Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
            <iframe src="https://www.googletagmanager.com/ns.html?id=${SECONDARY_GTM_ID}"
            height="0" width="0" style="display:none;visibility:hidden"></iframe>
            `,
          }}
        />

        {/* Facebook Pixel (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
            <img height="1" width="1" style="display:none"
            src="https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1"
            />
            `,
          }}
        />

        {/* AMP Analytics Config */}
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <amp-analytics type="gtag" data-credentials="include">
                <script type="application/json">
                  {
                    "vars": {
                      "gtag_id": "${GA_MEASUREMENT_ID}",
                      "config": {
                        "${GA_MEASUREMENT_ID}": {
                          "groups": "default"
                        }
                      }
                    },
                    "triggers": {}
                  }
                </script>
              </amp-analytics>
            `,
          }}
        />

        <Providers>
          <AuthRedirect>
            <Header />
            {children}
            <Toaster />
            <FooterAndFloatButtons/>
          </AuthRedirect>
        </Providers>
      </body>
    </html>
  );
}