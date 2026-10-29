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
          </span>{" "}
          through well-researched topics covering history, curious facts, and the
          latest industry trends. Our goal is to bring you engaging narratives and
          beautiful presentations, with animation and editing that make complex
          aviation subjects accessible and entertaining.
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
