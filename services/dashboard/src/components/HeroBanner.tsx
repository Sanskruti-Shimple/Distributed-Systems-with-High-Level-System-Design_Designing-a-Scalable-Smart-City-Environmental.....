import { Button, Card, Text, Title1 } from "@fluentui/react-components";
import { ArrowRightRegular } from "@fluentui/react-icons";
import type { ReactNode } from "react";

interface HeroAction {
  label: string;
  onClick: () => void;
}

interface HeroBannerProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  primaryAction: HeroAction;
  secondaryAction: HeroAction;
}

export function HeroBanner({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: HeroBannerProps) {
  return (
    <Card className="hero-banner">
      <svg
        className="hero-mesh"
        aria-hidden="true"
        viewBox="0 0 800 400"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="hero-accent" cx="0%" cy="0%" r="80%">
            <stop
              offset="0%"
              stopColor="var(--brand-accent)"
              stopOpacity="0.55"
            />
            <stop
              offset="100%"
              stopColor="var(--brand-accent)"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id="hero-primary" cx="100%" cy="100%" r="80%">
            <stop
              offset="0%"
              stopColor="var(--brand-primary)"
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              stopColor="var(--brand-primary)"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>
        <rect width="800" height="400" fill="url(#hero-accent)" />
        <rect width="800" height="400" fill="url(#hero-primary)" />
      </svg>
      <Text className="hero-eyebrow">
        <span className="hero-eyebrow__dot" />
        {eyebrow}
      </Text>
      <Title1 className="hero-title">{title}</Title1>
      <Text className="hero-subtitle">{subtitle}</Text>
      <div className="hero-actions">
        <Button
          appearance="primary"
          icon={<ArrowRightRegular />}
          iconPosition="after"
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </Button>
        <Button
          appearance="subtle"
          className="hero-secondary"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </Button>
      </div>
    </Card>
  );
}
