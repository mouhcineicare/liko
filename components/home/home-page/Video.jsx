
'use client';

import { useState } from "react";
import { Container } from "../components/Container";

export function Video({ videoId }) {
  const [playVideo, setPlayVideo] = useState(false);

  if (!videoId) return null;

  return (
    <div className="aspect-video relative w-full max-w-1/2 mx-auto overflow-hidden lg:mb-20 rounded-2xl  bg-vid-th  bg-cover bg-center">
      {!playVideo && (
        <button
          onClick={() => setPlayVideo(!playVideo)}
          className="absolute inset-auto  text-blue-600 transform -translate-x-1/2 -translate-y-1/2 lg:w-28 lg:h-28 top-1/2 left-1/2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-16 h-16  lg:w-28 lg:h-28 "
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          <span className="sr-only">Play Video</span>
        </button>
      )}
      {playVideo && (
        <iframe
          src={`https://www.youtube.com/embed/uFxnWWUJ7F0`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full aspect-video"
        ></iframe>
      )}
    </div>
  );
}
