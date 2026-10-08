import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

interface PhotoCarouselProps {
  photos: string[];
  title?: string;
  height?: string;
}

export default function PhotoCarousel({ photos, title = "", height = "h-48" }: PhotoCarouselProps) {
  if (photos.length === 0) {
    return (
      <div className={`flex ${height} items-center justify-center bg-gray-100 dark:bg-gray-700`}>
        <svg className="h-20 w-20 text-gray-300 dark:text-gray-600" viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 45 C15 45 18 30 30 30 L38 30 L42 25 L58 25 L62 30 L70 30 C82 30 85 45 85 45" />
          <line x1="10" y1="45" x2="90" y2="45" />
          <circle cx="30" cy="45" r="7" />
          <circle cx="30" cy="45" r="3" />
          <circle cx="70" cy="45" r="7" />
          <circle cx="70" cy="45" r="3" />
          <path d="M38 35 L45 35" />
          <path d="M55 35 L62 35" />
        </svg>
      </div>
    );
  }

  return (
    <Swiper
      modules={[Navigation, Pagination]}
      navigation
      pagination={{ clickable: true }}
      className={`photo-carousel ${height} w-full`}
    >
      {photos.map((url, i) => (
        <SwiperSlide key={i}>
          <img
            src={url}
            alt={`${title} - photo ${i + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
