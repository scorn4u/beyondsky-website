// "This is Beyond Sky." intro statement that follows the video hero.
export default function AboutIntro() {
  return (
    <section className="about-intro" id="about" aria-labelledby="about-intro-eyebrow">
      <div className="about-intro__inner">
        <p className="about-intro__eyebrow" id="about-intro-eyebrow">
          This is Beyond Sky.
        </p>
        <p className="about-intro__statement">
          Aviation is full of{" "}
          <span className="about-intro__highlight">stories worth telling.</span>{" "}
          We research, animate and explain the history, engineering and business
          behind the aircraft that connect our world, making complex aviation
          easy to follow and fun to watch.
        </p>
        <a
          className="about-intro__link"
          href="https://www.youtube.com/@BeyondSky-m5e/about"
          target="_blank"
          rel="noopener noreferrer"
        >
          More about us
        </a>
      </div>
    </section>
  );
}
