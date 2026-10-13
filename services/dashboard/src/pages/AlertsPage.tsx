import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Tab, TabList, Text, Title2 } from '@fluentui/react-components';
import { AlertRegular, ArrowClockwiseRegular, DataTrendingRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Alert, AlertListResponse, AlertState, HealthResponse } from '../api/types';
import { usePreviewDataState } from '../components/PreviewStateSwitcher';
import { DataFeedback, type DataStatus } from '../components/DataFeedback';
import { HeroBanner } from '../components/HeroBanner';

interface AlertPageData {
  alerts: AlertListResponse;
  health: HealthResponse;
}

export function AlertsPage() {
  const navigate = useNavigate();
  const previewState = usePreviewDataState();
  const [selectedState, setSelectedState] = useState<AlertState>('Open');
  const [status, setStatus] = useState<DataStatus>('loading');
  const [data, setData] = useState<AlertPageData | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async (alertState: AlertState) => {
    setStatus('loading');
    setError(undefined);
    try {
      const [alertResult, healthResult] = await Promise.all([
        api.listAlerts({ state: alertState, from: timeWindowStart(24), to: new Date().toISOString() }),
        api.getHealth(),
      ]);
      setData({ alerts: alertResult, health: healthResult });
      setStatus(alertResult.items.length === 0 ? 'empty' : 'data');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to retrieve system alerts.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api.listAlerts({ state: selectedState, from: timeWindowStart(24), to: new Date().toISOString() }),
      api.getHealth(),
    ])
      .then(([alertResult, healthResult]) => {
        if (!active) return;
        setData({ alerts: alertResult, health: healthResult });
        setStatus(alertResult.items.length === 0 ? 'empty' : 'data');
        setError(undefined);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Unable to retrieve system alerts.');
        setStatus('error');
      });
    return () => { active = false; };
  }, [previewState, selectedState]);

  const visibleAlerts = data?.alerts.items ?? [];
  const openCount = selectedState === 'Open' ? visibleAlerts.length : 2;

  return (
    <div className="page-stack">
      <HeroBanner
        eyebrow="Environmental incident desk"
        title="Alerts & system health"
        subtitle="Threshold anomalies and processing dependencies for the Metrovale monitoring pipeline."
        primaryAction={{ label: 'Retry alert feed', onClick: () => void load(selectedState) }}
        secondaryAction={{ label: 'Open sensor registry', onClick: () => navigate('/sensors') }}
      />

      <section className="health-strip" aria-label="System health summary">
        <Card className="health-summary">
          <div className="health-summary__heading">
            <DataTrendingRegular aria-hidden="true" />
            <div><Text weight="semibold">Processing pipeline</Text><Text size={200} className="section-caption">{data?.health.lastEventFreshness ?? 'Checking event freshness'}</Text></div>
          </div>
          <Badge appearance="tint" color={data?.health.status === 'healthy' ? 'success' : 'warning'}>{data?.health.status ?? 'Checking'}</Badge>
        </Card>
        <Card className="health-summary">
          <div className="health-summary__heading">
            <AlertRegular aria-hidden="true" />
            <div><Text weight="semibold">Active anomalies</Text><Text size={200} className="section-caption">Open threshold alerts in the last 24 hours</Text></div>
          </div>
          <Text className="health-count">{openCount}</Text>
        </Card>
      </section>

      <section className="content-section" aria-labelledby="alert-list-title">
        <div className="section-heading">
          <div className="section-title-group">
            <AlertRegular className="section-icon" aria-hidden="true" />
            <div>
              <Title2 id="alert-list-title">Threshold anomalies</Title2>
              <Text size={200} className="section-caption">Last 24 hours · readings are evaluated against city thresholds</Text>
            </div>
          </div>
          <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={() => void load(selectedState)}>Retry alert feed</Button>
        </div>

        <TabList
          selectedValue={selectedState}
          onTabSelect={(_, tab) => setSelectedState(String(tab.value) as AlertState)}
          className="alert-tabs"
        >
          <Tab value="Open">Open alerts</Tab>
          <Tab value="Resolved">Resolved</Tab>
        </TabList>

        <DataFeedback
          status={status}
          error={error}
          onRetry={() => void load(selectedState)}
          emptyTitle={selectedState === 'Resolved' ? 'No resolved alerts in this window' : 'No active threshold alerts'}
          emptyMessage="There are no matching alert records for the selected 24-hour window."
          emptyAction={selectedState === 'Resolved' ? 'Review open alerts' : 'Refresh alert feed'}
          onEmptyAction={() => selectedState === 'Resolved' ? setSelectedState('Open') : void load(selectedState)}
        >
          <Card className="table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Alert ID</th><th>Sensor / location</th><th>Condition</th><th>Severity</th><th>State</th><th>Time</th></tr></thead>
                <tbody>
                  {visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
                </tbody>
              </table>
            </div>
          </Card>
        </DataFeedback>
      </section>

      <section className="content-section" aria-labelledby="service-health-title">
        <div className="section-heading">
          <div className="section-title-group">
            <DataTrendingRegular className="section-icon" aria-hidden="true" />
            <div><Title2 id="service-health-title">Pipeline dependencies</Title2><Text size={200} className="section-caption">Service status and latest operational signal</Text></div>
          </div>
        </div>
        <div className="service-grid">
          {(data?.health.services ?? []).map((service) => (
            <Card key={service.name} className="service-row">
              <span className={`state-dot state-dot--${service.state}`} />
              <div><Text weight="semibold">{service.name}</Text><Text size={200} className="section-caption">{service.detail}</Text></div>
              <Badge appearance="tint" color={service.state === 'healthy' ? 'success' : 'warning'}>{service.state}</Badge>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const severityColor = alert.severity === 'Critical' ? 'danger' : alert.severity === 'Warning' ? 'warning' : 'informative';
  return (
    <tr>
      <th scope="row">{alert.id}</th>
      <td><strong>{alert.sensorId}</strong><span className="cell-secondary">{alert.location}</span></td>
      <td>{alert.condition}</td>
      <td><Badge appearance="tint" color={severityColor}>{alert.severity}</Badge></td>
      <td><Badge appearance="tint" color={alert.state === 'Open' ? 'warning' : 'success'}>{alert.state}</Badge></td>
      <td>{alert.timeLabel}</td>
    </tr>
  );
}

function timeWindowStart(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}