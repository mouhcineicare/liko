'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { Container } from '../components/Container';
import SectionTitle from '../components/SectionTitle';

const FeatureCards = () => {
  return (
    <section aria-labelledby="features-title">
      <Container>
        <SectionTitle
          preTitleClass="text-blue-400"
          titleClass="text-blue-600"
          childrenClass="text-gray-900 font-semibold"
          title="We nourish your hope back"
        >
          If you're ready for growth, change, and healing, iCareWellbeing is your trusted partner. 
          <br /> Our commitment revolves around three core principles:
        </SectionTitle>

        {/* Mobile view with Swiper */}
        <div className="block sm:hidden">
          <Swiper
            spaceBetween={15}
            slidesPerView={1.2}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 30,
              },
            }}
          >
            <SwiperSlide>
              <article className="block rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-gray-200 focus:outline-none focus:ring">
                <h2 className="mt-2 font-bold text-blue-600">Affordability</h2>
                <p className="mt-1 text-sm text-gray-600">
                  We believe that mental health care should be accessible to everyone. Our services are priced competitively to ensure you get the help you need without financial strain.
                </p>
              </article>
            </SwiperSlide>

            <SwiperSlide>
              <article className="block rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-gray-200 focus:outline-none focus:ring">
                <h2 className="mt-2 font-bold text-blue-600">Excellence</h2>
                <p className="mt-1 text-sm text-gray-600">
                  We are committed to providing the highest standard of care. Our experienced therapists use evidence-based approaches to help you achieve your mental health goals.
                </p>
              </article>
            </SwiperSlide>

            <SwiperSlide>
              <article className="block rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-gray-200 focus:outline-none focus:ring">
                <h2 className="mt-2 font-bold text-blue-600">Care</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Your well-being is our top priority. We offer a compassionate and supportive environment where you can feel safe and understood as you work towards healing.
                </p>
              </article>
            </SwiperSlide>
          </Swiper>
        </div>

        {/* Desktop view with Grid */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          <article className="block rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-gray-200 focus:outline-none focus:ring">
            <h2 className="mt-2 font-bold text-blue-600">Affordability</h2>
            <p className="mt-1 text-sm text-gray-600">
              We believe that mental health care should be accessible to everyone. Our services are priced competitively to ensure you get the help you need without financial strain.
            </p>
          </article>

          <article className="block rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-gray-200 focus:outline-none focus:ring">
            <h2 className="mt-2 font-bold text-blue-600">Excellence</h2>
            <p className="mt-1 text-sm text-gray-600">
              We are committed to providing the highest standard of care. Our experienced therapists use evidence-based approaches to help you achieve your mental health goals.
            </p>
          </article>

          <article className="block rounded-xl border border-gray-100 p-4 shadow-sm hover:border-gray-200 hover:ring-1 hover:ring-gray-200 focus:outline-none focus:ring">
            <h2 className="mt-2 font-bold text-blue-600">Care</h2>
            <p className="mt-1 text-sm text-gray-600">
              Your well-being is our top priority. We offer a compassionate and supportive environment where you can feel safe and understood as you work towards healing.
            </p>
          </article>
        </div>
      </Container>
    </section>
  );
};

export default FeatureCards;
