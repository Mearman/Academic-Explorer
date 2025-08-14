import { createFileRoute } from '@tanstack/react-router';
import * as styles from '../app/help.css';
import { Icon, Badge } from '@/components';

function HelpPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Academic Explorer Help Guide</h1>
          <p className={styles.description}>
            Learn how to make the most of Academic Explorer's powerful research tools
          </p>
        </div>

        <div className={styles.content}>
          <nav className={styles.toc}>
            <h2>Quick Navigation</h2>
            <ul>
              <li><a href="#getting-started">Getting Started</a></li>
              <li><a href="#basic-search">Basic Search</a></li>
              <li><a href="#advanced-search">Advanced Search</a></li>
              <li><a href="#filters">Using Filters</a></li>
              <li><a href="#export">Exporting Results</a></li>
              <li><a href="#saved-searches">Saved Searches</a></li>
              <li><a href="#data-viz">Data Visualisation</a></li>
              <li><a href="#tips">Tips & Best Practices</a></li>
            </ul>
          </nav>

          <div className={styles.guide}>
            <section id="getting-started" className={styles.section}>
              <h2><Icon name="home" size="sm" /> Getting Started</h2>
              <p>
                Academic Explorer is a powerful research tool that provides access to millions of academic works 
                through the OpenAlex API. Whether you're conducting systematic reviews, exploring citation networks, 
                or analysing research trends, Academic Explorer has the tools you need.
              </p>
              
              <div className={styles.feature}>
                <h3>Key Features</h3>
                <ul>
                  <li><strong>Advanced Search:</strong> Boolean operators, field-specific searches, and complex filters</li>
                  <li><strong>Smart Export:</strong> Multiple formats including BibTeX, RIS, CSV, and citation styles</li>
                  <li><strong>Data Visualisation:</strong> Interactive charts and citation network graphs</li>
                  <li><strong>Saved Searches:</strong> Store and reuse complex search queries</li>
                  <li><strong>Real-time Results:</strong> Live search with autocomplete suggestions</li>
                </ul>
              </div>
            </section>

            <section id="basic-search" className={styles.section}>
              <h2><Icon name="search" size="sm" /> Basic Search</h2>
              <p>
                Start your research journey with the search bar on the homepage. Simply enter keywords, 
                author names, or topics to find relevant academic works.
              </p>
              
              <div className={styles.example}>
                <h4>Example Searches:</h4>
                <ul>
                  <li><code>machine learning</code> - Find works about machine learning</li>
                  <li><code>climate change adaptation</code> - Research on climate adaptation</li>
                  <li><code>Smith et al</code> - Works by author Smith</li>
                  <li><code>"systematic review"</code> - Exact phrase search</li>
                </ul>
              </div>

              <div className={styles.tip}>
                <Icon name="info" size="sm" />
                <strong>Tip:</strong> Use quotation marks for exact phrase searches and the autocomplete 
                feature will suggest relevant authors, institutions, and topics.
              </div>
            </section>

            <section id="advanced-search" className={styles.section}>
              <h2><Icon name="settings" size="sm" /> Advanced Search</h2>
              <p>
                Access powerful search capabilities through the Advanced Search page. Combine multiple 
                fields, use Boolean operators, and apply sophisticated filters.
              </p>

              <div className={styles.subsection}>
                <h3>Search Modes</h3>
                <div className={styles.modeGrid}>
                  <div className={styles.mode}>
                    <Badge variant="default">Basic</Badge>
                    <p>Standard keyword search with stemming</p>
                  </div>
                  <div className={styles.mode}>
                    <Badge variant="info">Boolean</Badge>
                    <p>Use AND, OR, NOT operators for precise queries</p>
                  </div>
                  <div className={styles.mode}>
                    <Badge variant="success">Exact</Badge>
                    <p>Match exact terms without stemming</p>
                  </div>
                  <div className={styles.mode}>
                    <Badge variant="secondary">No Stem</Badge>
                    <p>Disable automatic word stemming</p>
                  </div>
                </div>
              </div>

              <div className={styles.subsection}>
                <h3>Search Fields</h3>
                <ul>
                  <li><strong>All Fields:</strong> Search across title, abstract, and full text</li>
                  <li><strong>Title Only:</strong> Restrict search to work titles</li>
                  <li><strong>Abstract:</strong> Search within abstracts only</li>
                  <li><strong>Full Text:</strong> Search complete document content</li>
                </ul>
              </div>

              <div className={styles.example}>
                <h4>Boolean Search Examples:</h4>
                <ul>
                  <li><code>machine AND learning</code> - Both terms must appear</li>
                  <li><code>climate OR environment</code> - Either term can appear</li>
                  <li><code>AI NOT "artificial intelligence"</code> - Exclude exact phrase</li>
                  <li><code>(deep OR machine) AND learning</code> - Complex combinations</li>
                </ul>
              </div>
            </section>

            <section id="filters" className={styles.section}>
              <h2><Icon name="filter" size="sm" /> Using Filters</h2>
              <p>
                Refine your search results with powerful filters. Narrow down by publication date, 
                open access status, citation counts, and more.
              </p>

              <div className={styles.filterGrid}>
                <div className={styles.filterGroup}>
                  <h4>Publication Filters</h4>
                  <ul>
                    <li>Publication year range</li>
                    <li>Specific publication dates</li>
                    <li>Journal or venue selection</li>
                    <li>Publisher filtering</li>
                  </ul>
                </div>
                
                <div className={styles.filterGroup}>
                  <h4>Access & Quality</h4>
                  <ul>
                    <li>Open Access status</li>
                    <li>DOI availability</li>
                    <li>Full text availability</li>
                    <li>Retraction status</li>
                  </ul>
                </div>
                
                <div className={styles.filterGroup}>
                  <h4>Impact Metrics</h4>
                  <ul>
                    <li>Citation count ranges</li>
                    <li>H-index thresholds</li>
                    <li>Altmetric scores</li>
                    <li>Journal impact factors</li>
                  </ul>
                </div>
                
                <div className={styles.filterGroup}>
                  <h4>Author & Institution</h4>
                  <ul>
                    <li>Specific author IDs</li>
                    <li>Institution affiliations</li>
                    <li>Country of origin</li>
                    <li>Funding sources</li>
                  </ul>
                </div>
              </div>

              <div className={styles.tip}>
                <Icon name="info" size="sm" />
                <strong>Pro Tip:</strong> Use the grouping feature to analyse your results by different 
                dimensions like publication year, journal, or research topic.
              </div>
            </section>

            <section id="export" className={styles.section}>
              <h2><Icon name="download" size="sm" /> Exporting Results</h2>
              <p>
                Export your search results in multiple formats for use in reference managers, 
                spreadsheets, or academic writing tools.
              </p>

              <div className={styles.exportGrid}>
                <div className={styles.exportFormat}>
                  <Icon name="publication" size="md" />
                  <h4>Academic Formats</h4>
                  <ul>
                    <li><strong>BibTeX:</strong> For LaTeX documents</li>
                    <li><strong>RIS:</strong> For Zotero, Mendeley, EndNote</li>
                    <li><strong>APA Citations:</strong> Formatted references</li>
                    <li><strong>MLA Citations:</strong> Literature references</li>
                  </ul>
                </div>
                
                <div className={styles.exportFormat}>
                  <Icon name="download" size="md" />
                  <h4>Data Formats</h4>
                  <ul>
                    <li><strong>JSON:</strong> Raw OpenAlex data</li>
                    <li><strong>CSV:</strong> For Excel and analysis tools</li>
                    <li><strong>Custom Export:</strong> Select specific fields</li>
                  </ul>
                </div>
              </div>

              <div className={styles.workflow}>
                <h4>Export Workflow:</h4>
                <ol>
                  <li>Perform your search and apply desired filters</li>
                  <li>Review your results for relevance</li>
                  <li>Click the Export Controls section</li>
                  <li>Select your preferred format</li>
                  <li>Download begins automatically</li>
                </ol>
              </div>
            </section>

            <section id="saved-searches" className={styles.section}>
              <h2><Icon name="save" size="sm" /> Saved Searches</h2>
              <p>
                Store complex search queries for future use. Perfect for ongoing research projects 
                and systematic reviews.
              </p>

              <div className={styles.savedSearchSteps}>
                <div className={styles.step}>
                  <Badge variant="default">1</Badge>
                  <div>
                    <h4>Create Your Search</h4>
                    <p>Build a complex search with filters and advanced parameters</p>
                  </div>
                </div>
                
                <div className={styles.step}>
                  <Badge variant="info">2</Badge>
                  <div>
                    <h4>Save the Query</h4>
                    <p>Click "Save Current Search" and provide a descriptive name</p>
                  </div>
                </div>
                
                <div className={styles.step}>
                  <Badge variant="success">3</Badge>
                  <div>
                    <h4>Reuse Anytime</h4>
                    <p>Access your saved searches from the Advanced Search sidebar</p>
                  </div>
                </div>
              </div>

              <div className={styles.tip}>
                <Icon name="info" size="sm" />
                <strong>Organisation Tip:</strong> Use descriptive names and tags for your saved searches. 
                Include project names, date ranges, or research questions for easy identification.
              </div>
            </section>

            <section id="data-viz" className={styles.section}>
              <h2><Icon name="trend_up" size="sm" /> Data Visualisation</h2>
              <p>
                Explore your research data through interactive charts, citation networks, and trend analysis.
              </p>

              <div className={styles.vizTypes}>
                <div className={styles.vizType}>
                  <h4>Citation Trends</h4>
                  <p>Track how citation patterns change over time</p>
                </div>
                
                <div className={styles.vizType}>
                  <h4>Collaboration Networks</h4>
                  <p>Visualise author and institution collaborations</p>
                </div>
                
                <div className={styles.vizType}>
                  <h4>Research Metrics</h4>
                  <p>Compare impact across different dimensions</p>
                </div>
                
                <div className={styles.vizType}>
                  <h4>Topic Analysis</h4>
                  <p>Explore research themes and concept relationships</p>
                </div>
              </div>

              <p>
                Visit the <strong>Dashboard</strong> to see examples of data visualisation capabilities 
                and explore interactive demos with sample research data.
              </p>
            </section>

            <section id="tips" className={styles.section}>
              <h2><Icon name="help" size="sm" /> Tips & Best Practices</h2>
              
              <div className={styles.tipsList}>
                <div className={styles.tipCard}>
                  <Icon name="search" size="md" />
                  <h4>Search Strategy</h4>
                  <ul>
                    <li>Start broad, then narrow with filters</li>
                    <li>Use autocomplete for accurate entity names</li>
                    <li>Try different synonyms and related terms</li>
                    <li>Check spelling and use alternative spellings</li>
                  </ul>
                </div>
                
                <div className={styles.tipCard}>
                  <Icon name="filter" size="md" />
                  <h4>Filter Effectively</h4>
                  <ul>
                    <li>Apply publication date ranges for recent research</li>
                    <li>Use open access filters for free content</li>
                    <li>Set minimum citation counts for impact</li>
                    <li>Filter by language if needed</li>
                  </ul>
                </div>
                
                <div className={styles.tipCard}>
                  <Icon name="download" size="md" />
                  <h4>Export Smartly</h4>
                  <ul>
                    <li>Export in batches for large result sets</li>
                    <li>Choose the right format for your tools</li>
                    <li>Include metadata for comprehensive records</li>
                    <li>Verify exported data before final use</li>
                  </ul>
                </div>
                
                <div className={styles.tipCard}>
                  <Icon name="save" size="md" />
                  <h4>Manage Searches</h4>
                  <ul>
                    <li>Use descriptive names for saved searches</li>
                    <li>Add project tags for organisation</li>
                    <li>Review and update searches regularly</li>
                    <li>Share search strategies with collaborators</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="troubleshooting" className={styles.section}>
              <h2><Icon name="warning" size="sm" /> Common Issues</h2>
              
              <div className={styles.troubleshoot}>
                <h4>No Results Found?</h4>
                <ul>
                  <li>Check spelling and try alternative terms</li>
                  <li>Reduce the number of filters applied</li>
                  <li>Use broader search terms</li>
                  <li>Try searching different fields (title vs. abstract)</li>
                </ul>
              </div>

              <div className={styles.troubleshoot}>
                <h4>Slow Search Performance?</h4>
                <ul>
                  <li>Limit search to specific fields when possible</li>
                  <li>Use date ranges to reduce dataset size</li>
                  <li>Avoid overly complex Boolean queries</li>
                  <li>Consider using sampling for large datasets</li>
                </ul>
              </div>

              <div className={styles.troubleshoot}>
                <h4>Export Issues?</h4>
                <ul>
                  <li>Check your browser's download settings</li>
                  <li>Try exporting smaller result sets</li>
                  <li>Ensure popup blockers aren't interfering</li>
                  <li>Use different export formats if one fails</li>
                </ul>
              </div>
            </section>

            <section className={styles.support}>
              <h2>Need More Help?</h2>
              <p>
                Academic Explorer is built on the OpenAlex database, which contains over 200 million 
                academic works. For additional support or feature requests, consult the OpenAlex 
                documentation or reach out to the development team.
              </p>
              
              <div className={styles.supportLinks}>
                <a href="https://docs.openalex.org" className={styles.supportLink}>
                  <Icon name="website" size="sm" />
                  OpenAlex Documentation
                </a>
                <a href="https://openalex.org" className={styles.supportLink}>
                  <Icon name="info" size="sm" />
                  About OpenAlex
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/help')({
  component: HelpPage,
});