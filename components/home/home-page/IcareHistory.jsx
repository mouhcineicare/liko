'use client';

import { FaInstagramSquare, FaWhatsappSquare, FaYoutube, FaYoutubeSquare } from "react-icons/fa";
import { Container } from "../components/Container";
import { Video } from "./Video";
import SectionTitle from "../components/SectionTitle";
// import secureSSL from '../assets/img/secure-ssl.png'

export const IcareHistory = () => {
  return (
    <Container className="text-left flex flex-col-reverse lg:flex-row">
      <div className=" flex-1 flex items-center">
        <div className="w-full mb-8">
          <span className="w-28 inline-block h-2 my-4 bg-blue-500 rounded-full"></span>
          <SectionTitle
            line={false}
            title={'Need help? Get in touch with us'}
            titleClass={'w-full text-left'}
            childrenClass={'text-left'}
          >
            We're always here when you need us!
          </SectionTitle>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Contact</h2>

          <table className="table-auto w-full">
            <tbody>
              <tr>
                <td className="py-2 font-semibold w-1/4 text-blue-600">
                  Phone:
                </td>
                <td className="py-2 w-3/4 text-gray-700">
                <a href="tel:+971505020658">(+971) 5050-20658</a></td>
              </tr>
              <tr>
                <td className="py-2 font-semibold w-1/4 text-blue-600">
                  Email:
                </td>
                <td className="py-2 w-3/4 text-gray-700">
                  <a href="mailto:heal@icarewellbeing.com">heal@icarewellbeing.com</a>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-semibold w-1/4 text-blue-600">
                  Address:
                </td>
                <td className="py-2 w-3/4 text-gray-700">
                  Dubai Silicon Oasis, DDP Building A2, Dubai, United Arab
                  Emirates
                </td>
              </tr>
            </tbody>
          </table>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Social Media
          </h2>
          <div className="justify-start flex mt-5 space-x-3 text-blue-500 ">
            <a href="https://www.youtube.com/@icarewellbeing" target="_blank">
              <span className="sr-only">Twitter</span>
              <FaYoutubeSquare size={40} color="red" />
            </a>

            <a href="https://www.instagram.com/icarewellbeing" target="_blank">
              <span className="sr-only">Instagram</span>
              <FaInstagramSquare size={40} color="black" />

            </a>
            <a href="https://971505020658" target="_blank">
              <span className="sr-only">Linkedin</span>
              <FaWhatsappSquare size={40} color="green" />

            </a>
          </div>
          <div className="text mt-3 font-normal">Easy Access, High Standards, Truly Affordable.</div>
          <span className="text-sm">Affordable Online Therapy in UAE: iCareWellbeing</span>
          <div className="flex justify-start items-center w-full">
             <img
            src={'/assets/img/secure-ssl.png'}
            width={100}
            className="mt-2 ml-0 z-10"
            />
          </div>
        </div>
      </div>
      <div className=" flex-1 flex items-center justify-center">
        <div className="sm:py-5 rounded-[30px] size-full flex items-center justify-center">
          <Video videoId="fZ0D0cnR88E" />
        </div>
      </div>
    </Container>
  );
};
