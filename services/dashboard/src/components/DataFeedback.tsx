import {
  Button,
  Card,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Skeleton,
  SkeletonItem,
  Text,
  Title3,
} from "@fluentui/react-components";
import { ArrowClockwiseRegular, InboxRegular } from "@fluentui/react-icons";
import type { ReactNode } from "react";

export type DataStatus = "loading" | "error" | "empty" | "data";

interface DataFeedbackProps {
  status: DataStatus;
  error?: string;
  onRetry: () => void;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction: string;
  onEmptyAction: () => void;
  children: ReactNode;
}

export function DataFeedback({
  status,
  error,
  onRetry,
  emptyTitle,
  emptyMessage,
  emptyAction,
  onEmptyAction,
  children,
}: DataFeedbackProps) {
  if (status === "loading") {
    return (
      <section
        className="loading-region"
        aria-label="Loading environmental data"
        aria-live="polite"
      >
        <Skeleton className="loading-lines">
          <SkeletonItem className="skeleton-line skeleton-line--wide" />
          <SkeletonItem className="skeleton-line" />
          <SkeletonItem className="skeleton-line skeleton-line--short" />
        </Skeleton>
        <Skeleton className="loading-lines">
          <SkeletonItem className="skeleton-line skeleton-line--wide" />
          <SkeletonItem className="skeleton-line" />
          <SkeletonItem className="skeleton-line skeleton-line--short" />
        </Skeleton>
        <Text size={200}>Refreshing the Metrovale sensor network…</Text>
      </section>
    );
  }

  if (status === "error") {
    return (
      <MessageBar intent="error" className="state-message">
        <MessageBarBody>
          <MessageBarTitle>Environmental data is unavailable</MessageBarTitle>
          <Text>{error ?? "The latest readings could not be loaded."}</Text>
          <Button
            appearance="primary"
            icon={<ArrowClockwiseRegular />}
            onClick={onRetry}
          >
            Retry data request
          </Button>
        </MessageBarBody>
      </MessageBar>
    );
  }

  if (status === "empty") {
    return (
      <Card className="empty-state">
        <InboxRegular className="empty-state__icon" aria-hidden="true" />
        <Title3>{emptyTitle}</Title3>
        <Text>{emptyMessage}</Text>
        <Button appearance="primary" onClick={onEmptyAction}>
          {emptyAction}
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}
