import { useState, useEffect } from "react";

const PHOTOS = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1540959733332-eab44c054d92?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1537996194471-e657df9e0c6b?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1496442221851-eea84b0d9e68?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1531366696109-6a47ad2d4a6f?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1920&q=80&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&fit=crop",
];

function BackgroundSlideshow({ children, className }) {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % PHOTOS.length);
        setNext((prev) => (prev + 1) % PHOTOS.length);
        setFading(false);
      }, 1000);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slideshow">
      <div className="bg-slideshow-images">
        <div
          className="bg-slide bg-slide-current"
          style={{ backgroundImage: `url(${PHOTOS[current]})` }}
        />
        <div
          className={`bg-slide bg-slide-next ${fading ? "bg-slide-visible" : ""}`}
          style={{ backgroundImage: `url(${PHOTOS[next % PHOTOS.length]})` }}
        />
      </div>
      <div className="bg-slideshow-overlay" />
      <div className={`bg-slideshow-content${className ? " " + className : ""}`}>
        {children}
      </div>
    </div>
  );
}

export default BackgroundSlideshow;
