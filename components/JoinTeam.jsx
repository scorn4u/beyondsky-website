import Image from "next/image";

// "Working for Beyond Sky" careers section: photo on the left, pitch on the right.
export default function JoinTeam() {
  return (
    <section className="join-team" id="jobs" aria-labelledby="join-team-eyebrow">
      <div className="join-team__inner">
        <div className="join-team__media">
          <Image
            src="/assets/join_team_desk.jpg"
            alt="Overhead view of hands at a keyboard and trackpad on a wooden desk, lit by the monitor"
            fill
            sizes="(max-width: 860px) 100vw, 48vw"
            className="join-team__img"
          />
        </div>

        <div className="join-team__copy">
          <p className="join-team__eyebrow" id="join-team-eyebrow">
            Working for Beyond Sky
          </p>
          <p className="join-team__statement">
            We are always looking for talent. Check out our current open roles and
            come <span className="join-team__highlight">join the team.</span>
          </p>
          <a className="join-team__link" href="mailto:beyondsky@intheblackmedia.com?subject=Joining%20Beyond%20Sky">
            Join us
          </a>
        </div>
      </div>
    </section>
  );
}
