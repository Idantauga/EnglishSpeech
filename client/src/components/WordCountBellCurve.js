import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../translations';
import { Chart, registerables } from 'chart.js';
import './WordCountBellCurve.css';

// Register all Chart.js components
Chart.register(...registerables);

// Set default chart colors for dark theme
Chart.defaults.color = '#ffffff';
Chart.defaults.borderColor = 'rgba(45, 52, 70, 0.5)';

const WordCountBellCurve = ({ wordCount, populationMean, populationStdDev, sampleSize }) => {
  const { language } = useLanguage();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  // Calculate z-score
  const zScore = (wordCount - populationMean) / populationStdDev;
  
  // Custom implementation of error function (erf) since Math.erf is not available in all browsers
  const erf = (x) => {
    // Constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    // Save the sign of x
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    // A&S formula 7.1.26
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  };
  
  // Calculate percentile using our custom erf function
  const percentile = (1 + erf(zScore / Math.sqrt(2))) / 2;
  const percentileFormatted = (percentile * 100).toFixed(1);
  
  useEffect(() => {
    // Ensure we clean up any existing chart before creating a new one
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    
    // Make sure the canvas element exists
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    
    // Generate bell curve data points
    const points = [];
    const minX = Math.max(0, populationMean - 3 * populationStdDev);
    const maxX = populationMean + 3 * populationStdDev;
    const step = populationStdDev / 10;
    
    // Ensure we have enough points for a smooth curve
    for (let x = minX; x <= maxX; x += step) {
      // Normal distribution formula
      const y = (1 / (populationStdDev * Math.sqrt(2 * Math.PI))) * 
                Math.exp(-0.5 * Math.pow((x - populationMean) / populationStdDev, 2));
      points.push({x, y});
    }
    
    // Ensure we have the user's word count point exactly
    if (wordCount > minX && wordCount < maxX) {
      const userY = (1 / (populationStdDev * Math.sqrt(2 * Math.PI))) * 
                Math.exp(-0.5 * Math.pow((wordCount - populationMean) / populationStdDev, 2));
      // We'll add this point in the separate dataset
    }
    
    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: getTranslation(language, 'wordCountDistribution'),
            data: points,
            borderColor: 'rgba(74, 108, 247, 0.8)',
            backgroundColor: 'rgba(74, 108, 247, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: getTranslation(language, 'yourWordCount'),
            data: [{
              x: wordCount, 
              y: (1 / (populationStdDev * Math.sqrt(2 * Math.PI))) * 
                 Math.exp(-0.5 * Math.pow((wordCount - populationMean) / populationStdDev, 2))
            }],
            borderColor: '#ffffff', // White border for the circle
            backgroundColor: '#ffffff', // White fill for the circle
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 2, // Make border more visible
            // Use a simple circle with shadow via CSS
            pointStyle: 'circle',
            // Add a class to the point element
            pointClass: 'user-point'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000
        },
        color: 'var(--text-color)', // Set default text color to white
        font: {
          family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: getTranslation(language, 'wordCount'),
              color: '#ffffff', // Explicit white color for axis title
              font: {
                size: 12,
                weight: 500
              },
              padding: {top: 10, bottom: 10}
            },
            ticks: {
              color: '#ffffff', // Explicit white color for axis ticks
              font: {
                size: 11,
                weight: 400
              },
              callback: function(value) {
                // Mark the average and user's word count
                if (Math.abs(value - populationMean) < populationStdDev / 5) {
                  return getTranslation(language, 'average') + ' (' + value.toFixed(0) + ')';
                }
                if (Math.abs(value - wordCount) < populationStdDev / 10) {
                  return wordCount;
                }
                return value.toFixed(0);
              }
            },
            grid: {
              color: 'rgba(45, 52, 70, 0.5)' // Slightly lighter than border-color for better visibility
            }
          },
          y: {
            display: false
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#ffffff', // Explicit white color for legend text
              font: {
                size: 12
              },
              boxWidth: 15,
              padding: 15
            },
            onClick: function() {
              // Disable legend click to prevent toggling datasets
              return false;
            }
          },
          tooltip: {
            backgroundColor: '#252b3b', // Explicit dark background for tooltip
            titleColor: '#ffffff', // White text for tooltip title
            bodyColor: '#ffffff', // White text for tooltip body
            borderColor: '#2d3446', // Dark border for tooltip
            borderWidth: 1,
            padding: 12,
            cornerRadius: 6,
            displayColors: true,
            titleFont: {
              size: 14,
              weight: 600
            },
            bodyFont: {
              size: 13
            },
            caretSize: 6,
            callbacks: {
              title: function(tooltipItems) {
                if (tooltipItems[0].datasetIndex === 1) {
                  return getTranslation(language, 'yourWordCount');
                }
                return getTranslation(language, 'wordCountDistribution');
              },
              label: function(context) {
                if (context.datasetIndex === 1) {
                  return [
                    `${getTranslation(language, 'words')}: ${wordCount}`,
                    `${getTranslation(language, 'percentile')}: ${percentileFormatted}%`
                  ];
                }
                return `${getTranslation(language, 'words')}: ${context.parsed.x.toFixed(0)}`;
              }
            }
          }
        }
      }
    });
    
    // Return cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [wordCount, populationMean, populationStdDev, language]);
  
  const getInterpretation = () => {
    if (zScore < -1.5) return getTranslation(language, 'wordCountMuchShorter');
    if (zScore < -0.5) return getTranslation(language, 'wordCountShorter');
    if (zScore < 0.5) return getTranslation(language, 'wordCountAverage');
    if (zScore < 1.5) return getTranslation(language, 'wordCountLonger');
    return getTranslation(language, 'wordCountMuchLonger');
  };
  
  return (
    <Box className="word-count-distribution">
      <Typography variant="subtitle1" sx={{ 
        color: 'text.primary',
        fontWeight: 600,
        mb: 2
      }}>
        {getTranslation(language, 'wordCountDistribution')}
      </Typography>
      
      <Box className="stats-summary" sx={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 3,
        justifyContent: 'center',
        mb: 2
      }}>
        <Box className="stat-item" sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {getTranslation(language, 'yourWordCount')}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {wordCount} {getTranslation(language, 'words')}
          </Typography>
        </Box>
        
        <Box className="stat-item" sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {getTranslation(language, 'average')}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {populationMean.toFixed(1)} {getTranslation(language, 'words')}
          </Typography>
        </Box>
        
        <Box className="stat-item" sx={{ textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {getTranslation(language, 'percentile')}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {percentileFormatted}%
          </Typography>
        </Box>
      </Box>
      
      <Box className="chart-container" sx={{ height: '200px', mb: 2 }}>
        <canvas ref={chartRef}></canvas>
      </Box>
      
      <Typography variant="body2" sx={{ 
        color: 'text.secondary',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        {getInterpretation()}
      </Typography>
    </Box>
  );
};

export default WordCountBellCurve;
