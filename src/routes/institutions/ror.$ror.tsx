import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { EntityDetector } from '@/lib/graph/utils/entity-detection'
import { useGraphData } from '@/hooks/use-graph-data'

export const Route = createFileRoute('/institutions/ror/$ror')({
  component: RORInstitutionRoute,
})

function RORInstitutionRoute() {
  const { ror } = Route.useParams()
  const navigate = useNavigate()
  const detector = new EntityDetector()
  const { loadEntity } = useGraphData()

  useEffect(() => {
    const resolveROR = async () => {
      try {
        // Decode the ROR parameter
        const decodedROR = decodeURIComponent(ror)

        // Detect and normalize the ROR ID
        const detection = detector.detectEntityIdentifier(decodedROR)

        if (detection.entityType === ('institution' as any) && detection.idType === 'ror') {
          // Load the institution entity data into the graph
          await loadEntity(`ror:${detection.normalizedId}`)

          // Navigate to the main graph view
          navigate({
            to: '/graph',
            replace: true,
          })
        } else {
          throw new Error(`Invalid ROR ID format: ${decodedROR}`)
        }
      } catch (error) {
        console.error('Failed to resolve ROR ID:', error)
        // Navigate to search with the ROR ID as query
        navigate({
          to: '/search',
          search: { q: ror },
          replace: true,
        })
      }
    }

    resolveROR()
  }, [ror, navigate, detector, loadEntity])

  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      fontSize: '16px'
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px' }}>
        🏛️ Resolving ROR ID...
      </div>
      <div style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {decodeURIComponent(ror)}
      </div>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        Loading institution details and building affiliation graph
      </div>
    </div>
  )
}