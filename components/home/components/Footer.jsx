'use client';
import React, { useState } from "react";
import { GoArrowUpRight } from "react-icons/go";
import programOne from "../assets/loveTreatment/footer-left.png";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

export function Footer() {
  const initialVisibleCount = 5;

  // State to track the number of visible items for Pages and Posts
  const [visiblePages, setVisiblePages] = useState(initialVisibleCount);
  const [visiblePosts, setVisiblePosts] = useState(initialVisibleCount);

  // Toggle functions to show more or less items
  const togglePagesVisibility = () => {
    setVisiblePages((prev) =>
      prev === initialVisibleCount ? pages.length : initialVisibleCount
    );
  };

  const togglePostsVisibility = () => {
    setVisiblePosts((prev) =>
      prev === initialVisibleCount ? posts.length : initialVisibleCount
    );
  };


  const pages = [
    { title: 'Therapy profile - martina', url: 'https://icarewellbeing.com/therapy-profile-martina/' },
    { title: 'Therapist profile - Giulia', url: 'https://icarewellbeing.com/therapist-profile-giulia/' },
    { title: 'therapy profile - Areesha Nawaz Chaudhry', url: 'https://icarewellbeing.com/areesha-nawaz-chaudhry/' },
    { title: 'Therapy profile - GRACE PRISCILLA', url: 'https://icarewellbeing.com/therapy-profile-grace-priscilla/' },
    { title: 'therapy -profile - ANUJA CHATURVEDI', url: 'https://icarewellbeing.com/anuja-chaturvedi/' },
    { title: 'therapy profile - Parwar Hamad', url: 'https://icarewellbeing.com/therapy-profile-parwar-hamad/' },
    { title: 'therapy profile - Laila Sikander', url: 'https://icarewellbeing.com/therapy-profile-laila-sikander/' },
    { title: 'About our stories', url: 'https://icarewellbeing.com/about-our-stories/' },
    { title: 'home-ar', url: 'https://icarewellbeing.com/home-ar/' },
    { title: 'iCareWellbeing therapist profile', url: 'https://icarewellbeing.com/icarewellbeing-therapist-profile/' },
    { title: 'Learn more about our Movement', url: 'https://icarewellbeing.com/learn-more-about-our-movement/' },
    { title: 'Privacy Policy and Terms of Service for iCareWellbeing', url: 'https://icarewellbeing.com/icarewellbeing-terms-and-conditions/' },
    { title: 'customer panel join your appointments', url: 'https://icarewellbeing.com/customer-panel-join-your-appointments/' },
    { title: 'Online therapy', url: 'https://icarewellbeing.com/online-therapy/' },
    { title: 'Forgot password', url: 'https://icarewellbeing.com/forgot-password/' },
    { title: 'If your are in crisis use this hotlines', url: 'https://icarewellbeing.com/crisis-hotline-mental-health/' },
    { title: 'Mental health with style', url: 'https://icarewellbeing.com/mental-health-with-style/' },
    { title: 'login', url: 'https://icarewellbeing.com/login/' },
    { title: 'booking', url: 'https://icarewellbeing.com/booking/' },
    { title: 'Mental health blog', url: 'https://icarewellbeing.com/mental-health-blog/' },
    { title: 'Become therapist in UAE', url: 'https://icarewellbeing.com/become-a-therapist-in-uae/' },
    { title: 'Online Therapy - Uae Most Affordable online therapy (90 AED)- iCare Wellbeing', url: 'https://icarewellbeing.com/' }
  ];
  const posts = [
    { title: '#2720 (no title)', url: 'https://icarewellbeing.com/affordable-therapy/' },
    { title: 'Free online therapy in Uae', url: 'https://icarewellbeing.com/free-online-therapy-uae/' },
    { title: 'to Mental Health Disorder Statistics in the UAE', url: 'https://icarewellbeing.com/to-mental-health-disorder-statistics-in-the-uae/' },
    { title: 'If You Can Afford Therapy, Do It', url: 'https://icarewellbeing.com/therapy/' },
    { title: 'Find a local therapist in the UAE', url: 'https://icarewellbeing.com/therapist/' },
    { title: 'BetterHelp vs. iCareWellbeing: Cost Comparison and Service Analysis', url: 'https://icarewellbeing.com/betterhelp/' },
    { title: 'Therapy vs Meditation', url: 'https://icarewellbeing.com/therapy-meditation/' },
    { title: 'The effect of sport on Mental Health', url: 'https://icarewellbeing.com/sport-mental-health/' },
    { title: 'Looking for therapy? Save money and time with iCareWellbeing', url: 'https://icarewellbeing.com/therapy-dubai/' },
    { title: 'Why is Mental Health Stigmatized?', url: 'https://icarewellbeing.com/why-is-mental-health-stigmatized/' },
    { title: 'iCareWellbeing: Revolutionizing Mental Health Services in the UAE', url: 'https://icarewellbeing.com/icarewellbeing-uae/' },
    { title: 'How to Become a Psychologist in the UAE', url: 'https://icarewellbeing.com/psychologist-uae/' },
    { title: 'Popular Foods and Mental Health', url: 'https://icarewellbeing.com/food-mental-health/' },
    { title: 'Quick mental health relief tips', url: 'https://icarewellbeing.com/mental-health-tips/' },
    { title: 'It’s Okay to Talk to a Therapist', url: 'https://icarewellbeing.com/its-okay-to-talk-to-a-therapist/' },
    { title: 'Is therapy in the metaverse beneficial?', url: 'https://icarewellbeing.com/is-therapy-in-the-metaverse-beneficial/' },
    { title: 'Who is iCareWellbeing', url: 'https://icarewellbeing.com/best-mental-health-platform/' },
    { title: 'tips for finding a psychologist in dubai', url: 'https://icarewellbeing.com/psychologist-dubai/' },
    { title: 'Top Tips for Choosing Online Therapy in the UAE', url: 'https://icarewellbeing.com/top-tips-for-choosing-online-therapy-uae/' },
    { title: 'Depression in Dubai', url: 'https://icarewellbeing.com/depression-dubai/' },
    { title: 'Talk to psychologist in 5 minutes.', url: 'https://icarewellbeing.com/talk-to-a-psychologist-in-5-minutes-mental-health-support-anytime-anywhere/' },
    { title: 'Psychologist Near You in Dubai for only 90 AED', url: 'https://icarewellbeing.com/psychologist-near-me/' },
    { title: 'A formula for a Successful healing journey :', url: 'https://icarewellbeing.com/best-way-to-heal/' },
    { title: 'Therapist\'s are facing financial issues and business management hassle.', url: 'https://icarewellbeing.com/therapist-are-being-under-paid/' },
    { title: 'How can I find the most affordable online therapy service?', url: 'https://icarewellbeing.com/how-can-i-find-the-most-affordable-online-therapy-service/' },
    { title: 'All You Need to Know About Mental Health in the UAE', url: 'https://icarewellbeing.com/mental-health-in-the-uae/' }
  ];
  return (
    <div className="relative">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
        <path
          fill="#60a5fa"
          fill-opacity="1"
          d="M0,160L30,144C60,128,120,96,180,74.7C240,53,300,43,360,69.3C420,96,480,160,540,165.3C600,171,660,117,720,106.7C780,96,840,128,900,117.3C960,107,1020,53,1080,37.3C1140,21,1200,43,1260,74.7C1320,107,1380,149,1410,170.7L1440,192L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z"
        ></path>
      </svg>

      <footer className="relative bg-blue-400 text-white">
        <div className=" mx-auto max-w-screen-xl overflow-hidden px-4 lg:pb-8 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md">
            <div className="flex flex-col text-white text-start">
            {/* <h2 className="text-orange-200 font-bold text-2xl">
              Don't use this site if in crisis use this resources (Click here) !
            </h2> */}
            <p className="text-4sm">
              {/* if you are in crisis or any other person maybe in danger 
               the following resources </a>
               can provide you with immediate help</p> */}
               Don't use this site If in crisis use this ressources ! <a 
              className="text-orange-200"
              href="https://icarewellbeing.com/crisis-hotline-mental-health/">(Click here) </a>
               If you are in a crisis or any other person may be in danger the following resources can provide you with immediate help.
             </p>
            </div>
          </div>

          <div className="lg:mt-16 grid grid-cols-1  lg:grid-cols-1">
            <div className="z-[1] hidden lg:grid gap-32 text-left lg:grid-cols-2 mx-auto">
              <div>
                <strong className="font-extrabold underline">Pages</strong>
                <ul className="mt-6 space-y-1">
                  {pages.slice(0, visiblePages).map((page, index) => (
                    <li key={index}>
                      <a
                        className="text-gray-200 transition hover:text-gray-300"
                        href={page.url}
                      >
                        {page.title}
                      </a>
                    </li>
                  ))}
                  {pages.length > initialVisibleCount && (
                    <li>
                      <button
                        className="text-gray-300 transition hover:text-gray-700 underline"
                        onClick={togglePagesVisibility}
                      >
                        {visiblePages === initialVisibleCount ? "Show More" : "Show Less"}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <strong className="font-extrabold underline">Posts</strong>
                <ul className="mt-6 space-y-1">
                  {posts.slice(0, visiblePosts).map((post, index) => (
                    <li key={index}>
                      <a
                        className="text-gray-200 transition hover:text-gray-300"
                        href={post.url}
                      >
                        {post.title}
                      </a>
                    </li>
                  ))}
                  {posts.length > initialVisibleCount && (
                    <li>
                      <button
                        className="text-gray-300 transition hover:text-gray-700 underline"
                        onClick={togglePostsVisibility}
                      >
                        {visiblePosts === initialVisibleCount ? "Show More" : "Show Less"}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className="lg:hidden grid text-red-700 z-[1] mx-auto">
              <Disclosure>
                {({ open }) => (
                  <ul className="mt-6 space-y-1 w-[70vw]">
                    <DisclosureButton className="flex items-center justify-between w-full px-4 py-4 text-lg text-left border-b rounded text-white hover:text-blue-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-opacity-75 ">
                      <span>Posts</span>
                      <svg
                        className={`w-5 h-5  transition-transform duration-300 ${open ? "transform rotate-180" : ""
                          }`}
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </DisclosureButton>
                    <DisclosurePanel className="px-4 pt-4 pb-2 text-gray-500 dark:text-gray-300">
                      {posts.map((post, index) => (
                        <li key={index}>
                          <a
                            className="text-gray-200 transition hover:text-gray-300"
                            href={post.url}
                          >
                            {post.title}
                          </a>
                        </li>
                      ))}
                    </DisclosurePanel>
                  </ul>
                )}
              </Disclosure>
              <Disclosure>
                {({ open }) => (
                  <ul className="mt-6 space-y-1 w-[70vw]">
                    <DisclosureButton className="flex items-center justify-between w-full px-4 py-4 text-lg text-left border-b rounded text-white hover:text-blue-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-opacity-75 ">
                      <span>Pages</span>
                      <svg
                        className={`w-5 h-5  transition-transform duration-300 ${open ? "transform rotate-180" : ""
                          }`}
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </DisclosureButton>
                    <DisclosurePanel className="px-4 pt-4 pb-2 text-gray-500 dark:text-gray-300">
                      {pages.map((page, index) => (
                        <li key={index}>
                          <a
                            className="text-gray-200 transition hover:text-gray-300"
                            href={page.url}
                          >
                            {page.title}
                          </a>
                        </li>
                      ))}
                    </DisclosurePanel>
                  </ul>
                )}
              </Disclosure>
            </div>
          </div>

    <div className="flex flex-row flex-wrap p-4 justify-center gap-8 items-center mt-10">
        <div className="text-center z-[1] text-xs/relaxed">
              <span>© 2024 iCarewellbeing. All right reserved</span>
              <br />
              <a href="https://icarewellbeing.com/icarewellbeing-terms-and-conditions/" className="text-white font-serif font-bold">Privacy Policy & Terms</a>
        </div>
     </div>
      </div>

        <img
          src={programOne}
          className="w-1/4 absolute bottom-0 right-0"
          loading="eager"
          placeholder="empty"
          alt=""
        />
        <img
          src={programOne}
          className="w-1/4 absolute bottom-0 left-0"
          loading="eager"
          placeholder="empty"
          alt=""
        />
      </footer>
    </div>
  );
}

const faqdata = [
  {
    question: "Why Choose iCare Well Being?",
    answer:
      "At iCare Well Being, you gain access to the best psychologists who approach their work with love, all at the most competitive price in the market. Our rates for licensed therapists are unmatched 90 AED for an online therapy session of one hour.",
  },
  {
    question: "Who will be helping me?",
    answer: "You will be matched with a licensed therapist.",
  },
  {
    question: "Why should I see a psychologist?",
    answer:
      "Seeing a psychologist helps you gain self-awareness, improve relationships, manage stress, boost self-confidence, and enhance your overall well-being. It’s about investing in yourself for a better, more fulfilling life.",
  },
];
