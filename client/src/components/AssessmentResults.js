import React from 'react';
import { Modal, Button, Typography, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../translations';
import WordCountBellCurve from './WordCountBellCurve';
import './AssessmentResults.css';

const AssessmentResults = ({ open, onClose, results, audioURL, question }) => {
  const { language } = useLanguage();
  
  // Safely extract the data from the results
  const output = results?.output || {};
  const assessment = output?.assessment || {};
  const feedback = output?.feedback || {};
  
  // Extract weighted average score from the new response format
  const weightedAverage = results?.weightedAverage?.score;
  
  // Extract duration, word count, and transcript from the new response format
  const duration = results?.duration;
  const wordCount = results?.word_count;
  const transcript = results?.transcript;
  
  // Extract statistical parameters for word count distribution
  // These parameters are at the top level of the response array's first item
  const sampleSize = results?.sample_size;
  const populationMean = results?.population_mean;
  const populationStdDev = results?.population_standard_deviation;
  
  // Debug logging
  console.log('Assessment results data:', results);
  console.log('Word count:', wordCount);
  console.log('Statistical parameters:', { sampleSize, populationMean, populationStdDev });
  
  if (!open || Object.keys(assessment).length === 0) {
    return null;
  }

  // Helper function to format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const sec = parseInt(seconds);
    const minutes = Math.floor(sec / 60);
    const remainingSeconds = sec % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${sec}s`;
  };

  const renderScoreBar = (score) => {
    const percentage = Math.min(Math.max(score, 0), 100); // Ensure score is between 0-100
    const color = 
      score >= 70 ? '#10b981' : // Green
      score >= 40 ? '#f59e0b' : // Yellow/Orange
      '#ef4444'; // Red
      
    return (
      <div style={{ 
        width: '100%', 
        marginTop: '8px', 
        marginBottom: '24px' 
      }}>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb', // Light grey background
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: '4px',
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="assessment-results-title"
      aria-describedby="assessment-results-description"
      className="assessment-results-modal"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: 800,
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: 24,
        p: 4,
        borderRadius: 'var(--border-radius)',
        overflowY: 'auto',
        border: '1px solid var(--border-color)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h5" component="h2" id="assessment-results-title" sx={{ 
            color: 'text.primary',
            fontWeight: 600
          }}>
            {getTranslation(language, 'assessmentResults')}
          </Typography>
          <IconButton 
            aria-label="close" 
            onClick={onClose}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Question and Audio Player Section */}
        {(question || audioURL) && (
          <Box className="content-section" sx={{ 
            mb: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            {question && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  {getTranslation(language, 'question')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {question}
                </Typography>
              </Box>
            )}
            
            {audioURL && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {getTranslation(language, 'yourResponse')}
                </Typography>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  mt: 1
                }}>
                  <audio 
                    controls 
                    src={audioURL}
                    style={{ 
                      width: '100%', 
                      maxWidth: '100%',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.04)'
                    }}
                  />
                </Box>
                
                {/* Response Statistics */}
                {(duration || wordCount) && (
                  <Box sx={{ 
                    mt: 2, 
                    display: 'flex', 
                    gap: 3,
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    {duration && (
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {getTranslation(language, 'duration')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {formatDuration(duration)}
                        </Typography>
                      </Box>
                    )}
                    {wordCount && (
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {getTranslation(language, 'wordCount')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {wordCount} {getTranslation(language, 'words')}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
        
        {/* Transcript Section */}
        {transcript && (
          <Box className="content-section" sx={{ 
            mb: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography variant="subtitle1" sx={{ 
              color: 'text.primary',
              fontWeight: 600,
              mb: 2
            }}>
              {getTranslation(language, 'transcript')}
            </Typography>
            <Box className="transcript-content" sx={{ 
              p: 2, 
              bgcolor: 'background.default', 
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--border-color)',
              lineHeight: 1.6
            }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {transcript}
              </Typography>
            </Box>
          </Box>
        )}
        
        {/* Word Count Distribution Section */}
        {wordCount && populationMean && populationStdDev && (
          <Box className="content-section" sx={{ 
            mb: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <WordCountBellCurve
              wordCount={parseInt(wordCount)}
              populationMean={populationMean}
              populationStdDev={populationStdDev}
              sampleSize={sampleSize}
            />
          </Box>
        )}
        
        {/* Weighted Average Score */}
        {weightedAverage !== undefined && (
          <Box className="content-section" sx={{ 
            mb: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography variant="subtitle1" sx={{ 
                color: 'text.primary',
                fontWeight: 600
              }}>
                {getTranslation(language, 'overallAssessment')}
              </Typography>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {getTranslation(language, 'score')}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 600,
                    color: weightedAverage >= 70 ? 'var(--success-color)' : 
                           weightedAverage >= 40 ? 'var(--warning-color, #ff9800)' : 
                           'var(--danger-color, #f44336)',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '0.5px'
                  }}
                >
                  {Math.round(weightedAverage)}/100
                </Typography>
              </Box>
            </Box>
            {renderScoreBar(weightedAverage)}
            
            <Typography variant="body2" sx={{ 
              mt: 2, 
              color: 'text.secondary',
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}>
              This score represents a weighted average based on the assessment criteria.
            </Typography>
          </Box>
        )}

        {Object.entries(assessment).map(([category, data]) => (
          <Box key={category} className="content-section" sx={{ 
            mb: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            '&:last-child': {
              mb: 0
            }
          }}>
            <Typography variant="subtitle1" sx={{ 
              textTransform: 'capitalize',
              mb: 2,
              color: 'text.primary',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{category.split('_').join(' ')}</span>
              <Typography component="span" variant="body2" sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontFeatureNumeric: 'tabular-nums'
              }}>
                {Math.round(data.score)}/100
              </Typography>
            </Typography>
            {renderScoreBar(data.score)}
            <Typography variant="body2" sx={{ 
              mt: 2,
              color: 'text.secondary',
              lineHeight: 1.6
            }}>
              {data.comment}
            </Typography>
          </Box>
        ))}

        {/* Great Parts Section */}
        {feedback?.great_parts && feedback.great_parts.length > 0 && (
          <Box className="success-section" sx={{ 
            mt: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'var(--success-color)',
            borderWidth: '1px',
            boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.1)'
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.primary',
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <span>👏</span> {getTranslation(language, 'whatYouDidWell')}
            </Typography>
            <Box component="ul" sx={{ 
              pl: 3,
              m: 0,
              '& li': {
                mb: 1.5,
                pl: 1,
                position: 'relative',
                '&:before': {
                  content: '"•"',
                  position: 'absolute',
                  left: -16,
                  color: 'var(--success-color)',
                  fontWeight: 'bold'
                }
              }
            }}>
              {feedback.great_parts.map((point, index) => (
                <li key={index}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    {point}
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        {/* Improvement Suggestions Section */}
        {feedback?.improvement_suggestions && feedback.improvement_suggestions.length > 0 && (
          <Box className="content-section improvement-suggestions" sx={{ 
            mt: 4,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'text.primary',
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <span>✨</span> {getTranslation(language, 'improvementSuggestions')}
            </Typography>
            <Box component="ul" sx={{ 
              pl: 3,
              m: 0,
              '& li': {
                mb: 1.5,
                pl: 1,
                position: 'relative',
                '&:before': {
                  content: '"•"',
                  position: 'absolute',
                  left: -16,
                  color: 'primary.main',
                  fontWeight: 'bold'
                }
              }
            }}>
              {feedback.improvement_suggestions.map((suggestion, index) => (
                <li key={index}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    {suggestion}
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ 
          mt: 4, 
          display: 'flex', 
          justifyContent: 'flex-end',
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button 
            onClick={onClose} 
            variant="contained"
            color="primary"
            size="large"
            sx={{
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }
            }}
          >
            {getTranslation(language, 'done')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AssessmentResults;
