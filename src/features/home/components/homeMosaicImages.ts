import image0_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM-480w.webp'
import image0_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM-768w.webp'
import image0_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM-960w.webp'
import image1_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM (1)-480w.webp'
import image1_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM (1)-768w.webp'
import image1_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM (1)-960w.webp'
import image2_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM (2)-480w.webp'
import image2_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM (2)-768w.webp'
import image2_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.38 PM (2)-960w.webp'
import image3_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM-480w.webp'
import image3_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM-768w.webp'
import image3_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM-960w.webp'
import image4_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (1)-480w.webp'
import image4_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (1)-768w.webp'
import image4_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (1)-960w.webp'
import image5_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (2)-480w.webp'
import image5_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (2)-768w.webp'
import image5_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (2)-960w.webp'
import image6_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (3)-480w.webp'
import image6_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (3)-768w.webp'
import image6_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (3)-960w.webp'
import image7_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (4)-480w.webp'
import image7_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (4)-768w.webp'
import image7_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.39 PM (4)-960w.webp'
import image8_480 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.40 PM-480w.webp'
import image8_768 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.40 PM-768w.webp'
import image8_960 from '@/assets/home-mosaic/responsive/WhatsApp Image 2026-07-27 at 9.08.40 PM-960w.webp'

type ResponsiveImage = {
  src: string
  srcSet: string
}

function responsiveImage(image480: string, image768: string, image960: string): ResponsiveImage {
  return {
    src: image960,
    srcSet: `${image480} 480w, ${image768} 768w, ${image960} 960w`,
  }
}

export const homeMosaicImages = [
  responsiveImage(image0_480, image0_768, image0_960),
  responsiveImage(image1_480, image1_768, image1_960),
  responsiveImage(image2_480, image2_768, image2_960),
  responsiveImage(image3_480, image3_768, image3_960),
  responsiveImage(image4_480, image4_768, image4_960),
  responsiveImage(image5_480, image5_768, image5_960),
  responsiveImage(image6_480, image6_768, image6_960),
  responsiveImage(image7_480, image7_768, image7_960),
  responsiveImage(image8_480, image8_768, image8_960),
] as const
