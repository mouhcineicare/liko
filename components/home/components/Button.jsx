import React from 'react'

const Button = ({ title, className = "" }) => {
    const handleScroll = () => {
        //https://icarewellbeing.com/home/start-online-therapy
        window.open('https://icarewellbeing.com/home/start-online-therapy')
        // let targetRef = document.getElementById('matching')
        // if (targetRef) {
        //     targetRef.scrollIntoView({ behavior: 'smooth' });
        // }
    };
    return (
        <button onClick={handleScroll} className={`btn ${className}`}>
            {title}
        </button>
    )
}

export default Button