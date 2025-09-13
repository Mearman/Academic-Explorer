/**
 * STAR datasets management interface
 * Upload, manage, and process systematic literature review datasets
 */

import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'

export const Route = createFileRoute('/evaluation/datasets')({
  component: DatasetsManagement,
})

interface STARDataset {
  id: string
  name: string
  uploadDate: Date
  reviewTopic: string
  originalPaperCount: number
  includedPapers: WorkReference[]
  excludedPapers: WorkReference[]
  searchStrategy: SearchCriteria
  metadata: {
    description?: string
    methodology: string
    dateRange?: string
    originalSource?: string
  }
}

interface WorkReference {
  title: string
  authors: string[]
  doi?: string
  openalexId?: string
  publicationYear: number
  source: string
}

interface SearchCriteria {
  keywords: string[]
  databases: string[]
  dateRange?: {
    start: number
    end: number
  }
  inclusionCriteria: string[]
  exclusionCriteria: string[]
}

function DatasetsManagement() {
  const [datasets, setDatasets] = useState<STARDataset[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Parse file (placeholder logic)
      const newDataset: STARDataset = {
        id: `dataset_${Date.now()}`,
        name: uploadFile.name.replace(/\.[^/.]+$/, ''),
        uploadDate: new Date(),
        reviewTopic: 'Extracted from file', // TODO: Parse from file
        originalPaperCount: Math.floor(Math.random() * 200) + 50,
        includedPapers: [], // TODO: Parse from file
        excludedPapers: [], // TODO: Parse from file
        searchStrategy: {
          keywords: [], // TODO: Parse from file
          databases: [],
          inclusionCriteria: [],
          exclusionCriteria: []
        },
        metadata: {
          description: 'Uploaded from file',
          methodology: 'STAR',
          originalSource: uploadFile.name
        }
      }

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Add to datasets
      setDatasets(prev => [...prev, newDataset])

      // Reset upload state
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadFile(null)
        setShowUploadModal(false)
      }, 1000)

    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            STAR Datasets
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            Manage systematic literature review datasets for evaluation comparisons
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📤 Upload Dataset
        </button>
      </div>

      {/* Datasets Grid */}
      {datasets.length === 0 ? (
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            No datasets uploaded yet
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upload your first STAR dataset to begin evaluation. Supported formats: CSV, JSON, Excel.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Upload Your First Dataset
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {dataset.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  Topic: {dataset.reviewTopic}
                </p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Uploaded {formatDate(dataset.uploadDate)}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
              }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                    {dataset.originalPaperCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Papers</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                    {dataset.includedPapers.length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Included</div>
                </div>
              </div>

              {dataset.metadata.description && (
                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginBottom: '16px',
                  lineHeight: '1.4'
                }}>
                  {dataset.metadata.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    console.log('View dataset details:', dataset.id)
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    console.log('Run comparison with:', dataset.id)
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Run Comparison
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Upload STAR Dataset
              </h2>
            </div>

            <div style={{ padding: '24px' }}>
              {!uploadFile ? (
                <div
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb'
                  }}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📤</div>
                  <p style={{ fontSize: '16px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Upload your dataset file
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    Supported formats: CSV, JSON, Excel (.xlsx)
                  </p>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.json,.xlsx,.xls"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Choose File
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      Selected file: {uploadFile.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                      Size: {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {isUploading && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '14px', color: '#374151' }}>Uploading...</span>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>{uploadProgress}%</span>
                      </div>
                      <div style={{
                        backgroundColor: '#e5e7eb',
                        borderRadius: '4px',
                        height: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          backgroundColor: '#3b82f6',
                          height: '100%',
                          width: `${uploadProgress}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px'
              }}>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadProgress(0)
                  }}
                  disabled={isUploading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    opacity: isUploading ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || isUploading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: uploadFile && !isUploading ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: uploadFile && !isUploading ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isUploading ? 'Processing...' : 'Upload Dataset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}