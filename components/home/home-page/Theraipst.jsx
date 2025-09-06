'use client';

import Image from "next/image";
import { useState } from "react";

const Theraipst = () => {
  const [selectedArticle, setSelectedArticle] = useState("article-02");
  
  const handleChange = (event) => {
    setSelectedArticle(event.target.id);
  };

  return (
    <section className="w-full max-w-sm">
      <div className="relative w-full">
        <input
          id="article-01"
          type="radio"
          name="slider"
          className="sr-only"
          checked={selectedArticle === "article-01"}
          onChange={handleChange}
        />
        <input
          id="article-02"
          type="radio"
          name="slider"
          className="sr-only"
          checked={selectedArticle === "article-02"}
          onChange={handleChange}
        />

        {/* Therapist Card */}
        <div className="relative bg-white border rounded-lg shadow-lg overflow-hidden w-full">
          <Image
            src={'/assets/img/therapist1.PNG'}
            width={300}
            height={300}
            className="w-full object-cover rounded-lg"
            alt="therapist"
          />
          <div className="absolute bottom-3 left-3 text-white text-left bg-black bg-opacity-50 p-3 rounded-lg">
            <div className="font-bold text-lg mb-1">Victoria Anelo Eguilez</div>
            <div className="text-sm">Online Therapy</div>
            <div className="text-sm">CBT, Act, Humanistic...</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Theraipst;
