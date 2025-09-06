import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { motion } from "framer-motion";
import logo from '../assets/img/icarelogo.png';

export const Navbar = () => {
  const navigation = [
    { title: "Therapist Profiles", url: "https://icarewellbeing.com/icarewellbeing-therapist-profile/" },
    { title: "Our stories", url: "https://icarewellbeing.com/about-our-stories/" },
    { title: "Blog", url: "https://icarewellbeing.com/mental-health-blog/" },
    { title: "Become a Therapist", url: "https://icarewellbeing.com/become-a-therapist-in-uae/" },
    // { title: "Talk to a Psychologist", url: "https://icarewellbeing.com/talk-to-a-psychologist-in-5-minutes-mental-health-support-anytime-anywhere/" },
  ];

  return (
    <div className="w-full">
      <nav className="bg-gray-100 relative flex flex-wrap items-center justify-between p-4 mx-auto lg:justify-between xl:px-11">
        {/* Logo  */}
        <Disclosure>
          {({ open }) => (
            <>
              <div className="flex flex-row flex-wrap items-center justify-between w-full lg:w-auto">
                <a className="sm:w-full w-1/5" href="/">
                  <span>
                    <img
                      src={logo}
                      alt="N"
                      width="62"
                      height="62"
                      loading="lazy"
                      placeholder="empty"
                    />
                  </span>
                </a>

                <div className='flex flex-row w-3/5 items-center justify-center lg:hidden'>
                  <motion.a
                      href="https://icarewellbeing.com/login"
                      className="w-full text-center text-white bg-blue-600 p-2 rounded-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: navigation.length * 0.1 }}
                    >
                      My Appointments
                    </motion.a>
                </div>

                <DisclosureButton
                  aria-label="Toggle Menu"
                  className="flex flex-row items-center justify-end w-1/5 py-1 text-gray-500 rounded-md lg:hidden hover:text-blue-500 focus:text-blue-500 focus:bg-indigo-100 focus:outline-none dark:text-gray-900 dark:focus:bg-trueGray-700"
                >
                  <svg
                    className="w-6 h-6 mr-4 fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    {open && (
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"
                      />
                    )}
                    {!open && (
                      <path
                        fillRule="evenodd"
                        d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
                      />
                    )}
                  </svg>
                </DisclosureButton>

                <DisclosurePanel className="flex flex-wrap w-full my-5 lg:hidden">
                  <>
                    {navigation.map((item, index) => (
                      <motion.a
                        key={index}
                        href={item.url}
                        target="_blank"
                        className="w-full px-2 py-2 rounded-md dark:text-gray-900 hover:text-blue-500 focus:text-blue-500 focus:bg-blue-100 focus:outline-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        {item.title}
                      </motion.a>
                    ))}
                    <motion.a
                      href="https://icarewellbeing.com/login"
                      className="w-full px-6 py-2 mt-3 text-center text-white bg-blue-600 rounded-md lg:ml-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: navigation.length * 0.1 }}
                    >
                      My Appointments
                    </motion.a>
                  </>
                </DisclosurePanel>
              </div>
            </>
          )}
        </Disclosure>

        {/* menu  */}
        <div className="hidden text-center lg:flex lg:items-center">
          <ul className="items-center justify-end flex-1 pt-6 list-none lg:pt-0 lg:flex">
            {navigation.map((menu, index) => (
              <motion.li
                className="mr-3"
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <a
                  href={menu.url}
                  target="_blank"
                  className="inline-block px-4 py-2 text-lg font-normal text-gray-800 no-underline rounded-md dark:text-gray-900 hover:text-blue-500 focus:text-blue-500 focus:bg-blue-100 focus:outline-none dark:focus:bg-gray-800"
                >
                  {menu.title}
                </a>
                {index != navigation.length - 1 && (
                  <span className="w-3 mx-1 inline-block h-3 bg-gray-300 rounded-full"></span>
                )}
              </motion.li>

            ))}
          </ul>
        </div>

        <motion.div
          className="hidden mr-3 space-x-4 lg:flex nav__item"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: navigation.length * 0.1 }}
        >
          <a
            href="/login"
            className="px-6 py-2 text-white bg-blue-600 rounded-full md:ml-5"
          >
            My Appointments
          </a>
        </motion.div>
      </nav>
    </div>
  );
};
