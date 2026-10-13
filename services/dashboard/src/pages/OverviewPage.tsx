import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Text, Title2 } from "@fluentui/react-components";
import {
  ArrowTrendingRegular,
  ArrowSyncRegular,
  LocationRegular,
  WeatherHazeRegular,
} from "@fluentui/react-icons";
import { motion, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { HealthResponse, LatestReadingsResponse } from "../api/types";
import { usePreviewDataState } from "../components/PreviewStateSwitcher";
import { DataFeedback, type DataStatus } from "../components/DataFeedback";
import { HeroBanner } from "../components/HeroBanner";

interface OverviewData {
  health: HealthResponse;
  latest: LatestReadingsResponse;
}

export function OverviewPage() {
  const navigate = useNavigate();
  const previewState = usePreviewDataState();
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<DataStatus>("loading");
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setStatus("loading");
    setError(undefined);
    try {
      const [healthResult, latestResult] = await Promise.all([
        api.getHealth(),
        api.getLatestReadings(),
      ]);
      setData({ health: healthResult, latest: latestResult });
      setStatus(latestResult.items.length === 0 ? "empty" : "data");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to retrieve city conditions.",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([api.getHealth(), api.getLatestReadings()])
      .then(([healthResult, latestResult]) => {
        if (!active) return;
        setData({ health: healthResult, latest: latestResult });
        setStatus(latestResult.items.length === 0 ? "empty" : "data");
        setError(undefined);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to retrieve city conditions.",
        );
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [previewState]);

  const readings = data?.latest.items ?? [];
  const health = data?.health;

  return (
    <div className="page-stack">
      <HeroBanner
        eyebrow="Metrovale air quality"
        title={
          <>
            <span>AQI 42</span>{" "}
            <Badge appearance="tint" color="success">
              Good
            </Badge>
          </>
        }
        subtitle="Citywide conditions are good. The latest validated readings arrived 12 seconds ago."
        primaryAction={{
          label: "Explore sensors",
          onClick: () => navigate("/sensors"),
        }}
        secondaryAction={{
          label: "Review active alerts",
          onClick: () => navigate("/alerts"),
        }}
      />

      <section className="metric-grid" aria-label="City metrics">
        <motion.div
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.16 }}
        >
          <Card className="metric-tile">
            <div className="metric-label">
              <ArrowTrendingRegular />
              Metrovale AQI
            </div>
            <Text className="metric-value">42</Text>
            <Text className="metric-note">
              <Badge appearance="tint" color="success">
                Good
              </Badge>{" "}
              · updated 12 sec ago
            </Text>
          </Card>
        </motion.div>
        <motion.div
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.16 }}
        >
          <Card className="metric-tile">
            <div className="metric-label">
              <WeatherHazeRegular />
              Civic Center PM2.5
            </div>
            <Text className="metric-value">
              8.7 <span>ug/m3</span>
            </Text>
            <Text className="metric-note">Normal · Downtown</Text>
          </Card>
        </motion.div>
        <motion.div
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.16 }}
        >
          <Card className="metric-tile">
            <div className="metric-label">
              <LocationRegular />
              Sensor coverage
            </div>
            <Text className="metric-value">
              {health?.sensorCoverage.online ?? 47} of{" "}
              {health?.sensorCoverage.total ?? 49}
            </Text>
            <Text className="metric-note">
              {health?.sensorCoverage.onlinePercent ?? 96}% online ·{" "}
              {health?.sensorCoverage.delayed ?? 2} delayed
            </Text>
          </Card>
        </motion.div>
      </section>

      <section className="content-section" aria-labelledby="readings-title">
        <div className="section-heading">
          <div className="section-title-group">
            <ArrowSyncRegular className="section-icon" aria-hidden="true" />
            <div>
              <Title2 id="readings-title">Latest sensor readings</Title2>
              <Text size={200} className="section-caption">
                Validated observations from across the city
              </Text>
            </div>
          </div>
          <Text size={200} className="section-count">
            {readings.length || 3} sensors
          </Text>
        </div>

        <DataFeedback
          status={status}
          error={error}
          onRetry={() => void load()}
          emptyTitle="No readings in this window"
          emptyMessage="The latest-reading feed returned no sensor observations."
          emptyAction="Return to city overview"
          onEmptyAction={() => void load()}
        >
          <Card className="table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Location</th>
                    <th>Latest reading</th>
                    <th>Freshness</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((sensor) => (
                    <tr key={sensor.id}>
                      <th scope="row">{sensor.id}</th>
                      <td>{sensor.location}</td>
                      <td>
                        {sensor.latestReadings
                          .map(
                            (reading) =>
                              `${reading.metric} ${reading.value} ${reading.unit}`,
                          )
                          .join(" · ")}
                      </td>
                      <td>{sensor.freshnessLabel}</td>
                      <td>
                        <Badge
                          appearance="tint"
                          color={
                            sensor.state === "online" ? "success" : "warning"
                          }
                        >
                          {sensor.state === "online" ? "Online" : "Delayed"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </DataFeedback>
      </section>

      <div className="overview-refresh">
        <Button
          appearance="subtle"
          icon={<ArrowSyncRegular />}
          onClick={() => void load()}
        >
          Refresh city snapshot
        </Button>
        <Text size={200}>
          Most recent event · {health?.lastEventFreshness ?? "12 sec ago"}
        </Text>
      </div>
    </div>
  );
}
