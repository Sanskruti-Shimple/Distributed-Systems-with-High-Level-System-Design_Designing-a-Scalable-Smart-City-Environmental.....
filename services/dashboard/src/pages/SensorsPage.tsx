import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Field, Select, Text, Title2 } from '@fluentui/react-components';
import { ArrowSyncRegular, SearchRegular, SensorsRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Metric, SensorListResponse, SensorListQuery, SensorState } from '../api/types';
import { usePreviewDataState } from '../components/PreviewStateSwitcher';
import { DataFeedback, type DataStatus } from '../components/DataFeedback';
import { HeroBanner } from '../components/HeroBanner';

const locations = ['All locations', 'Civic Center, Downtown', 'Riverside Park', 'East Market'];
const metrics: Array<'All metrics' | Metric> = ['All metrics', 'AQI', 'PM2.5', 'Temperature', 'Humidity', 'Noise'];
const states: Array<'Any state' | SensorState> = ['Any state', 'online', 'delayed', 'offline'];

export function SensorsPage() {
  const navigate = useNavigate();
  const previewState = usePreviewDataState();
  const [filters, setFilters] = useState({ location: 'All locations', metric: 'All metrics', state: 'Any state' });
  const [status, setStatus] = useState<DataStatus>('loading');
  const [result, setResult] = useState<SensorListResponse | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async (query: SensorListQuery) => {
    setStatus('loading');
    setError(undefined);
    try {
      const response = await api.listSensors(query);
      setResult(response);
      setStatus(response.items.length === 0 ? 'empty' : 'data');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to retrieve the sensor registry.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const query = toQuery(filters);
    void api.listSensors(query)
      .then((response) => {
        if (!active) return;
        setResult(response);
        setStatus(response.items.length === 0 ? 'empty' : 'data');
        setError(undefined);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Unable to retrieve the sensor registry.');
        setStatus('error');
      });
    return () => { active = false; };
  }, [filters, previewState]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const query = toQuery(filters);
  const sensors = result?.items ?? [];

  return (
    <div className="page-stack">
      <HeroBanner
        eyebrow="Sensor registry"
        title="Find a city sensor"
        subtitle="Inspect location, active metrics, latest values, and collection freshness across the Metrovale network."
        primaryAction={{ label: 'Reset sensor filters', onClick: () => setFilters({ location: 'All locations', metric: 'All metrics', state: 'Any state' }) }}
        secondaryAction={{ label: 'Review system alerts', onClick: () => navigate('/alerts') }}
      />

      <section className="content-section" aria-labelledby="sensor-filter-title">
        <div className="section-heading">
          <div className="section-title-group">
            <SearchRegular className="section-icon" aria-hidden="true" />
            <div>
              <Title2 id="sensor-filter-title">Filter the registry</Title2>
              <Text size={200} className="section-caption">Narrow the live sensor list by location, metric, and operational state.</Text>
            </div>
          </div>
          <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={() => void load(query)}>Refresh readings</Button>
        </div>

        <Card className="filter-panel">
          <Field label="Location">
            <Select value={filters.location} onChange={(_, data) => updateFilter('location', data.value)}>
              {locations.map((location) => <option key={location}>{location}</option>)}
            </Select>
          </Field>
          <Field label="Metric">
            <Select value={filters.metric} onChange={(_, data) => updateFilter('metric', data.value)}>
              {metrics.map((metric) => <option key={metric}>{metric}</option>)}
            </Select>
          </Field>
          <Field
            label="Operational state"
            validationState="warning"
            validationMessage="Delayed sensors may show readings up to 5 minutes old."
          >
            <Select value={filters.state} onChange={(_, data) => updateFilter('state', data.value)}>
              {states.map((state) => <option key={state} value={state}>{state === 'Any state' ? state : state[0].toUpperCase() + state.slice(1)}</option>)}
            </Select>
          </Field>
        </Card>
      </section>

      <section className="content-section" aria-labelledby="sensor-table-title">
        <div className="section-heading">
          <div className="section-title-group">
            <SensorsRegular className="section-icon" aria-hidden="true" />
            <div>
              <Title2 id="sensor-table-title">Latest readings</Title2>
              <Text size={200} className="section-caption">{sensors.length} sensors match the selected filters</Text>
            </div>
          </div>
        </div>

        <DataFeedback
          status={status}
          error={error}
          onRetry={() => void load(query)}
          emptyTitle="No sensors match these filters"
          emptyMessage="Try a different location, metric, or operational state."
          emptyAction="Clear sensor filters"
          onEmptyAction={() => setFilters({ location: 'All locations', metric: 'All metrics', state: 'Any state' })}
        >
          <Card className="table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Sensor ID</th><th>Location</th><th>Metrics</th><th>Latest reading</th><th>State</th></tr></thead>
                <tbody>
                  {sensors.map((sensor) => (
                    <tr key={sensor.id}>
                      <th scope="row">{sensor.id}</th>
                      <td>{sensor.location}</td>
                      <td>{sensor.metrics.join(', ')}</td>
                      <td>{sensor.latestReadings.map((reading) => `${reading.value} ${reading.unit}`).join(' · ')}<span className="reading-freshness">{sensor.freshnessLabel}</span></td>
                      <td><span className={`sensor-state sensor-state--${sensor.state}`}><span className="state-dot" />{sensor.state === 'delayed' ? 'Delayed' : sensor.state === 'online' ? 'Online' : 'Offline'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </DataFeedback>
      </section>
      <Text size={200} className="sensor-result-note">Last updated 12 sec ago · Sensor registry refreshes continuously</Text>
    </div>
  );
}

function toQuery(filters: { location: string; metric: string; state: string }): SensorListQuery {
  return {
    ...(filters.location !== 'All locations' ? { location: filters.location } : {}),
    ...(filters.metric !== 'All metrics' ? { metric: filters.metric as Metric } : {}),
    ...(filters.state !== 'Any state' ? { state: filters.state as SensorState } : {}),
  };
}