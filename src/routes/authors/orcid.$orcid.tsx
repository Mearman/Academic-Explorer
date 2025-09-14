import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { EntityDetector } from '@/lib/graph/utils/entity-detection'
import { useGraphData } from '@/hooks/use-graph-data'

export const Route = createFileRoute('/authors/orcid/$orcid')({
  component: ORCIDAuthorRoute,
})

function ORCIDAuthorRoute() {
  const { orcid } = Route.useParams()
  const navigate = useNavigate()
  const detector = new EntityDetector()
  const { loadEntity } = useGraphData()

  useEffect(() => {
    const resolveORCID = async () => {
      try {
        // Decode the ORCID parameter
        const decodedORCID = decodeURIComponent(orcid)

        // Detect and normalize the ORCID
        const detection = detector.detectEntityIdentifier(decodedORCID)

        if (detection.entityType === ('author' as any) && detection.idType === 'orcid') {
          // Load the author entity data into the graph
          await loadEntity(`orcid:${detection.normalizedId}`)

          // Navigate to the main graph view
          navigate({
            to: '/graph',
            replace: true,
          })
        } else {
          throw new Error(`Invalid ORCID format: ${decodedORCID}`)
        }
      } catch (error) {
        console.error('Failed to resolve ORCID:', error)
        // Navigate to search with the ORCID as query
        navigate({
          to: '/search',
          search: { q: orcid },
          replace: true,
        })
      }
    }

    resolveORCID()
  }, [orcid, navigate, detector, loadEntity])

  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      fontSize: '16px'
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px' }}>
        👤 Resolving ORCID...
      </div>
      <div style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {decodeURIComponent(orcid)}
      </div>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        Loading author details and building collaboration graph
      </div>
    </div>
  )
}