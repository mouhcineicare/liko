import React from "react";
import { Container } from "./Container";


// const isIcon = (preTitle: string) => preTitle == 'Born in UAE, made for GCC';

const SectionTitle = ({
  preTitle,
  title,
  preTitleClass = "",
  titleClass = "",
  childrenClass = "",
  children,
  className,
  line = true
}) => {
  const props = {};
  return (
    <div
      className={`flex w-full flex-col sm:mt-4 items-center justify-center text-center text-black ${className}`}
    >
     {line && <span className="w-48 my-2 inline-block h-1 bg-blue-500 rounded-full"></span>}
     {preTitle && (
        <div className={`text-md sm:text-3xl text-black flex gap-2 items-center font-bold tracking-wider ${preTitleClass}`}>
          {preTitle == 'Born in UAE, made for GCC' && uaeIcon()} {preTitle}
        </div>
      )}
      {title && (
        <h2
          className={`title ${titleClass} text-black font-serif text-2xl font-bold leading-snug tracking-tight lg:leading-tight`}
        >
          {title}
        </h2>
      )}

      {children && (
          <p className={`text max-w-5xl text-black ${childrenClass} py-3`}>{children}</p>
      )}
    </div>
  );
};

export default SectionTitle;

const uaeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
    <path
      fill="#ea3323"
      d="M5 4h6v24H5c-2.208 0-4-1.792-4-4V8c0-2.208 1.792-4 4-4Z"
    />
    <path d="M10 20v8h17a4 4 0 0 0 4-4v-4H10Z" />
    <path fill="#fff" d="M10 11h21v10H10z" />
    <path fill="#317234" d="M27 4H10v8h21V8a4 4 0 0 0-4-4Z" />
    <path
      d="M27 4H5a4 4 0 0 0-4 4v16a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4Zm3 20c0 1.654-1.346 3-3 3H5c-1.654 0-3-1.346-3-3V8c0-1.654 1.346-3 3-3h22c1.654 0 3 1.346 3 3v16Z"
      opacity={0.15}
    />
    <path
      fill="#fff"
      d="M27 5H5a3 3 0 0 0-3 3v1a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3V8a3 3 0 0 0-3-3Z"
      opacity={0.2}
    />
  </svg>
)
