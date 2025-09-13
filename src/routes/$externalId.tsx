import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { EntityDetector } from '@/lib/graph/utils/entity-detection'
import { useGraphData } from '@/hooks/use-graph-data'

export const Route = createFileRoute('/$externalId')({
  component: ExternalIdRoute,
})

function ExternalIdRoute() {
  const { externalId } = Route.useParams()
  const navigate = useNavigate()
  const detector = new EntityDetector()
  const { loadEntity } = useGraphData()

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Decode the parameter
        const decodedId = decodeURIComponent(externalId)

        // Detect entity type and ID type
        const detection = detector.detectEntityIdentifier(decodedId)

        if (detection.entityType && detection.idType !== 'openalex') {
          // This is a recognized external ID, redirect to specific route
          const entityTypePlural = detection.entityType + 's'
          let specificRoute: string

          switch (detection.idType) {
            case 'doi':
              specificRoute = `/works/doi/${encodeURIComponent(detection.normalizedId)}`
              break
            case 'orcid':
              specificRoute = `/authors/orcid/${detection.normalizedId}`
              break
            case 'ror':
              specificRoute = `/institutions/ror/${detection.normalizedId}`
              break
            case 'issn_l':
              specificRoute = `/sources/issn/${detection.normalizedId}`
              break
            default:
              throw new Error(`Unsupported ID type: ${detection.idType}`)
          }

          navigate({
            to: specificRoute,
            replace: true,
          })
        } else if (detection.entityType) {
          // This is an OpenAlex ID, load directly
          await loadEntity(detection.normalizedId)
          navigate({
            to: '/graph',
            replace: true,
          })
        } else {
          throw new Error(`Unable to detect entity type for: ${decodedId}`)
        }
      } catch (error) {
        console.error('Failed to resolve external ID:', error)

        // Fallback to search
        navigate({
          to: '/search',
          search: { q: externalId },
          replace: true,
        })
      }
    }

    resolveExternalId()
  }, [externalId, navigate, detector, loadEntity])

  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      fontSize: '16px'
    }}>
      <div style={{ marginBottom: '20px', fontSize: '18px' }}>
        🔍 Resolving identifier...
      </div>
      <div style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {decodeURIComponent(externalId)}
      </div>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        Detecting entity type and loading data
      </div>
    </div>
  )
}