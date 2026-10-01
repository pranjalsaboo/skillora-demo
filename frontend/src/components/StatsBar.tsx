import { Link } from "@tanstack/react-router";
import { Flame, Heart, BoltLightning, Home, Trophy, UserCircle, Users } from "reicon-react";
import skilloraLogo from "@/assets/skillora-logo.png";
import { MAX_HEARTS, heartRegenLabel, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { useOnline } from "@/lib/offline";

export function StatsBar() {
  const progress = useProgress();
  const regen = heartRegenLabel(progress);
  const online = useOnline();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link to="/" className="mr-auto flex items-center gap-2">
          <img src={skilloraLogo} alt="Skillora" className="size-8 rounded-xl" />
          <span className="font-display text-lg font-bold tracking-tight">Skillora</span>
        </Link>

        {!online && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">Offline</span>
        )}

        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
          <Flame
            size={16}
            weight={progress.streak > 0 ? "Filled" : "Outline"}
            className={progress.streak > 0 ? "text-streak" : "text-muted-foreground"}
          />
          <span className="text-sm font-bold tabular-nums">{progress.streak}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5" title={regen ?? "Hearts full"}>
          <Heart
            size={16}
            weight={progress.hearts > 0 ? "Filled" : "Outline"}
            className={progress.hearts > 0 ? "text-heart" : "text-muted-foreground"}
          />
          <span className="text-sm font-bold tabular-nums">
            {progress.hearts}
            <span className="text-muted-foreground">/{MAX_HEARTS}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
          <BoltLightning size={16} weight="Filled" className="text-xp" />
          <span className="text-sm font-bold tabular-nums">{progress.xp}</span>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const items = [
    { to: "/", label: "Learn", Icon: Home },
    { to: "/community", label: "Community", Icon: Users },
    { to: "/leaderboard", label: "League", Icon: Trophy },
    { to: "/profile", label: "Profile", Icon: UserCircle },
  ] as const;

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-4">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold text-muted-foreground transition-colors"
            activeProps={{ className: "!text-primary" }}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} weight={isActive ? "Filled" : "Outline"} />
                <span>{label}</span>
              </>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
