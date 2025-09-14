import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { EntityDetector } from '@/lib/graph/utils/entity-detection'
import { useGraphData } from '@/hooks/use-graph-data'
import { logError } from '@/lib/logger'

export const Route = createFileRoute('/sources/issn/$issn')({
  component: ISSNSourceRoute,
})

function ISSNSourceRoute() {
  const { issn } = Route.useParams()
  const navigate = useNavigate()
  const detector = useMemo(() => new EntityDetector(), [])
  const { loadEntity } = useGraphData()

  useEffect(() => {
    const resolveISSN = async () => {
      try {
        // Decode the ISSN parameter
        const decodedISSN = decodeURIComponent(issn)

        // Detect and normalize the ISSN
        const detection = detector.detectEntityIdentifier(decodedISSN)

        if (detection.entityType === 'sources' && detection.idType === 'issn_l') {
          // Load the source entity data into the graph
          await loadEntity(`issn:${detection.normalizedId}`)

          // No navigation needed - graph is always visible
        } else {
          throw new Error(`Invalid ISSN format: ${decodedISSN}`)
        }
      } catch (error) {
        logError('Failed to resolve ISSN:', error, 'ISSNSourceRoute', 'routing')
        // Navigate to search with the ISSN as query
        navigate({
          to: '/search',
          search: { q: issn },
          replace: true,
        })
      }
    }

    resolveISSN()
  }, [issn, navigate, detector, loadEntity])

  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      fontSize: '16px'
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px' }}>
        📚 Resolving ISSN...
      </div>
      <div style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {decodeURIComponent(issn)}
      </div>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        Loading source details and building publication graph
      </div>
    </div>
  )
}