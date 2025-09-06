'use client';

// import communicateYourWay from "/assets/img/communicate-your-way.webp";
import { Container } from "../components/Container";
import Button from "../components/Button";
import SectionTitle from "../components/SectionTitle";

export const CommunicateYourWay = () => {
  return (
    <section aria-labelledby="communicate-your-way-title">
      <Container className="flex flex-wrap text-center sm:text-left flex-col lg:flex-row">
        <div className="flex items-center w-full lg:w-1/2">
          <div className="max-w-2xl mb-8">

            <SectionTitle
              titleClass="sm:text-left"
              childrenClass="sm:text-left lg:text-xl"
              title={"Once matched, start therapy and connect with your therapist through various communication modes."}
              line={false}
            >
             Whether you prefer chatting during stressful work moments or having a comforting video call, we have flexible options for you.
            </SectionTitle>
          </div>
        </div>

        <div className="max-h-[80vh] flex flex-col items-center justify-center w-full lg:w-1/2">
          <img
            src={'/assets/img/communicate-your-way.webp'}
            className={"object-contain w-[80%] lg:w-full"}
            alt="Communicate your way illustration"
            loading="lazy"
            placeholder="empty"
          />

          <div className="justify-center sm:justify-start flex items-start gap-3">
              <Button
                title={'Get Free Trial'}
                className="text-white bg-blue-500 border-blue-500"
              />
            </div>
        </div>
      </Container>
    </section>
  );
};
