import React from 'react';
import { useParams } from 'react-router-dom';
import { useTriageInspection } from '../hooks/useTriageInspection';
import { TriageColorBanner } from '../components/TriageColorBanner';
import { OcrConfidenceGauge } from '../components/OcrConfidenceGauge';
import { MetricTelemetryCard } from '../components/MetricTelemetryCard';
import { BaselineVarianceMeter } from '../components/BaselineVarianceMeter';
import { FraudWarningAlert } from '../components/FraudWarningAlert';
import { TelemetryComparisonTable } from '../components/TelemetryComparisonTable';
import { AnomalyReason } from '../types/triage.types';

export const TriageSummaryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isLoading, error, triageData } = useTriageInspection(id || '');

  if (isLoading) {
    return <div className="p-8 text-center text-gray-600">Loading Triage Summary...</div>;
  }

  if (error || !triageData) {
    return <div className="p-8 text-center text-red-600">Error: {error || 'Triage record not found'}</div>;
  }

  const { triage_record: record } = triageData;
  const { extracted_metrics: metrics, prior_metrics: prior, anomaly_reason } = record;

  // Mock baseline anchors for demo purposes
  const baselineAnchors = prior || { systolic: 120, diastolic: 80, glucose: 100 };

  const isPhysiologicalImpossibility = anomaly_reason === AnomalyReason.PHYSIOLOGICAL_IMPOSSIBILITY;
  const isDataFabrication = anomaly_reason === AnomalyReason.SUSPECTED_DATA_FABRICATION;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Triage Summary & Telemetry Dashboard</h1>
        <TriageColorBanner color={record.triage_color} anomalyReason={record.anomaly_reason} />
      </header>

      {isDataFabrication && <FraudWarningAlert />}

      {isPhysiologicalImpossibility && (
        <div className="bg-red-50 border border-red-300 p-4 rounded text-red-800 text-sm">
          <strong>Biological Impossibility Warning:</strong> Blood pressure falls outside physiological ranges or readings are inverted.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <OcrConfidenceGauge confidence={metrics.confidence_score} />
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Biometric Readings</h3>
            <div className="grid grid-cols-2 gap-4">
              <MetricTelemetryCard label="Systolic" value={metrics.systolic} unit="mmHg" />
              <MetricTelemetryCard label="Diastolic" value={metrics.diastolic} unit="mmHg" />
              <MetricTelemetryCard label="Glucose" value={metrics.glucose} unit="mg/dL" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Baseline Variance Analysis</h3>
            <div className="space-y-4">
              <BaselineVarianceMeter 
                label="Systolic" 
                extractedValue={metrics.systolic} 
                baselineValue={baselineAnchors.systolic} 
              />
              <BaselineVarianceMeter 
                label="Diastolic" 
                extractedValue={metrics.diastolic} 
                baselineValue={baselineAnchors.diastolic} 
              />
              <BaselineVarianceMeter 
                label="Glucose" 
                extractedValue={metrics.glucose} 
                baselineValue={baselineAnchors.glucose} 
              />
            </div>
          </div>
        </div>
      </div>

      {prior && (
        <section>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Historical Cycle Comparison</h3>
          <TelemetryComparisonTable currentMetrics={metrics} priorMetrics={prior} />
        </section>
      )}
    </div>
  );
};
