// "This is Beyond Sky." intro statement that follows the video hero.
export default function AboutIntro() {
  return (
    <section className="about-intro" id="about" aria-labelledby="about-intro-eyebrow">
      <div className="about-intro__inner">
        <p className="about-intro__eyebrow" id="about-intro-eyebrow">
          This is Beyond Sky.
        </p>
        <p className="about-intro__statement">
          We explore{" "}
          <span className="about-intro__highlight">
            the fascinating world of aviation
          </span>
          , from history and curious facts to the latest trends, with engaging
          stories and animation that make complex topics easy to enjoy.
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
