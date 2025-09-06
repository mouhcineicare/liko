
'use client';
// import fqa from "/assets/img/fqa.webp";
// import fqaMobile from "/assets/img/fqa-mobile.png";
import { Container } from "../components/Container";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdArrowDropright, IoMdArrowDropup } from "react-icons/io";
import Button from "../components/Button";

export const Fqa = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Container className="text-center sm:text-left bg-blue-500 flex justify-evenly items-center flex-wrap ">
      <>
        <img
          src={'/assets/img/fqa.webp'}
          className={"hidden sm:block object-contain"}
          alt="Hero Illustration"
          loading="lazy"
          placeholder="empty"
        />
        <img
          src={'/assets/img/fqa-mobile.png'}
          className={"block sm:hidden object-contain"}
          alt="Hero Illustration"
          loading="lazy"
          placeholder="empty"
        />
      </>
      <div className="flex items-center lg:px-10 w-full lg:w-1/2 mt-4 sm:mt-auto">
        <div className="w-full sm:max-w-2xl mb-8">
          {/* <h1 className="title font-bold leading-snug tracking-tight text-white lg:leading-tight xl:leading-tight">
            Get answers to common questions about US
          </h1> */}
          <span className="w-28 inline-block h-2 my-3 bg-white rounded-full"></span>
          <div className="space-y-4 ">
            {faqdata.map((item, index) => (
              <div key={index} className="group">
                <button
                  onClick={() => handleToggle(index)}
                  className="text-blue-500 flex cursor-pointer items-center justify-start underline gap-1 rounded-lg bg-gray-50 p-4 w-full text-left"
                >
                  {openIndex === index ? <IoMdArrowDropup size={20} /> : <IoMdArrowDropright size={20} />}
                  <h2 className="font-medium">{item.question}</h2>
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.4 }}
                      className="px-4 leading-relaxed text-white"
                    >
                      <p>{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="flex justify-start">
            <Button
              title={'Get Started'}
              className="mt-4 text-blue-500 bg-white"
            />
          </div>

        </div>
      </div>
    </Container>
  );
};

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
