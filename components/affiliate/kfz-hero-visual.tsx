import Image from "next/image"

/**
 * Decorative vehicle artwork supplied by the owner for the Kfz campaign.
 * The image is deliberately hidden from assistive technology because the
 * adjacent hero copy carries the page meaning and CTA.
 */
export function KfzHeroVisual() {
  return (
    <div aria-hidden="true" className="kfz-visual-stage relative mx-auto h-[20rem] w-full max-w-[38rem] sm:h-[25rem]">
      <div className="kfz-visual-orb pointer-events-none absolute inset-x-8 bottom-8 h-36 rounded-full blur-3xl" />
      <div className="kfz-visual-grid pointer-events-none absolute inset-0 rounded-[2rem]" />

      <Image
        src="/images/kfz-hero-car.png"
        alt=""
        width={620}
        height={540}
        priority
        className="kfz-hero-car relative z-10 mx-auto h-full w-full object-contain object-center"
      />

      <div className="kfz-visual-card absolute right-2 top-4 z-20 hidden w-32 p-3 sm:block">
        <div className="mb-3 h-1.5 w-10 rounded-full bg-[#5dbbff]" />
        <div className="h-2 w-20 rounded-full bg-white/70" />
        <div className="mt-2 h-1.5 w-24 rounded-full bg-white/20" />
        <div className="mt-5 space-y-2.5">
          <span className="flex items-center gap-2"><i /><b /></span>
          <span className="flex items-center gap-2"><i /><b /></span>
          <span className="flex items-center gap-2"><i /><b /></span>
        </div>
      </div>
    </div>
  )
}
