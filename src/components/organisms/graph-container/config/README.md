# Graph Engine Configuration System

A comprehensive, dynamic configuration system for different graph rendering engines. This system provides engine-specific configuration panels with real-time validation, settings import/export, and accessible form controls.

## Overview

The configuration system consists of four main components:

1. **`EngineConfigPanel`** - Main configuration interface with tabs and engine switching
2. **`CustomSVGConfig`** - SVG-specific rendering and export settings
3. **`CustomWebGLConfig`** - WebGL performance, shaders, and rendering pipeline settings
4. **`ConfigFormControls`** - Reusable, accessible form components with validation

## Quick Start

```tsx
import { EngineConfigPanel } from '@/components';

function GraphSettings() {
  const handleConfigChange = (config) => {
    console.log('Configuration updated:', config);
  };

  return (
    <EngineConfigPanel
      compact={false}
      showAdvanced={true}
      showPreview={true}
      onChange={handleConfigChange}
      collapsible={true}
    />
  );
}
```

## Components

### EngineConfigPanel

The main configuration interface that dynamically displays engine-specific settings based on the selected rendering engine.

**Features:**
- Dynamic form generation based on engine capabilities
- Tabbed interface (Global Settings / Engine-Specific Settings)
- Configuration import/export as JSON
- Real-time validation with error messages
- Preset loading for SVG and WebGL engines
- Collapsible/expandable interface
- Integration with the graph engine provider

**Props:**
```tsx
interface EngineConfigPanelProps {
  compact?: boolean;              // Compact layout for smaller spaces
  showAdvanced?: boolean;         // Show advanced configuration options
  showPreview?: boolean;          // Show live preview of settings
  onChange?: (config) => void;    // Configuration change callback
  onValidationChange?: (validation) => void; // Validation state callback
  className?: string;             // Custom CSS class
  collapsible?: boolean;          // Allow panel collapse
  defaultCollapsed?: boolean;     // Start collapsed
}
```

**Example Usage:**
```tsx
<EngineConfigPanel
  compact={false}
  showAdvanced={true}
  showPreview={true}
  onChange={(config) => {
    // Save configuration to storage
    localStorage.setItem('graphEngineConfig', JSON.stringify(config));
  }}
  onValidationChange={(validation) => {
    if (!validation.isValid) {
      console.warn('Configuration errors:', validation.errors);
    }
  }}
  collapsible={true}
/>
```

### CustomSVGConfig

Specialized configuration form for SVG rendering engines with export options, styling controls, and layout settings.

**Configuration Sections:**
- **SVG Rendering** - Vectorization quality, stroke rendering, text rendering, export formats
- **Canvas & Layout** - Canvas size, margins, viewBox settings, grid display
- **Visual Styling** - Default vertex/edge/label styling, themes, color schemes

**Features:**
- Export format selection (SVG, PDF, EPS)
- Path precision and optimization settings
- Custom CSS and web font support
- Real-time validation of colors and dimensions
- Grid and guide overlays
- Theme presets (High Quality, Web Optimized, Minimal Size)

**Example:**
```tsx
import { CustomSVGConfig, defaultCustomSVGConfig } from '@/components';

function SVGSettings() {
  const [config, setConfig] = useState(defaultCustomSVGConfig);
  
  return (
    <CustomSVGConfig
      config={config}
      onChange={setConfig}
      compact={false}
      showPreview={true}
    />
  );
}
```

### CustomWebGLConfig

Advanced configuration form for WebGL rendering engines with performance tuning, shader settings, and rendering pipeline controls.

**Configuration Sections:**
- **Performance Settings** - Frame rate limits, memory management, LOD, culling
- **Shader Settings** - Vertex/fragment shader profiles, lighting, shadows, antialiasing
- **Rendering Settings** - WebGL context, blending, depth testing, viewport scaling

**Features:**
- Performance vs. quality trade-offs
- Custom shader support
- Hardware-accelerated rendering options
- Post-processing effects (bloom, edge detection)
- Memory management and garbage collection
- Performance presets (Performance, High Quality, Balanced)

**Example:**
```tsx
import { CustomWebGLConfig, defaultCustomWebGLConfig } from '@/components';

function WebGLSettings() {
  const [config, setConfig] = useState(defaultCustomWebGLConfig);
  
  return (
    <CustomWebGLConfig
      config={config}
      onChange={setConfig}
      compact={false}
      showPreview={true}
    />
  );
}
```

### ConfigFormControls

A collection of reusable, accessible form components with built-in validation and consistent styling.

**Available Controls:**
- **TextInput** - Text fields with validation
- **NumberInput** - Number inputs with range validation
- **Select** - Dropdown selects with descriptions
- **Checkbox** - Boolean toggles with descriptions
- **Switch** - Toggle switches for boolean values
- **ColorPicker** - Color selection with validation
- **RangeSlider** - Numeric sliders with live values
- **FormSection** - Collapsible form sections

**Validation System:**
```tsx
import { ValidationUtils } from '@/components';

// Validate required fields
const validation = ValidationUtils.required(value, 'Field Name');

// Validate numbers with ranges
const numberValidation = ValidationUtils.number(
  value, 
  { min: 0, max: 100 }, 
  'Percentage'
);

// Validate colors
const colorValidation = ValidationUtils.color(value, 'Background Color');

// Combine validations
const combined = ValidationUtils.combine(validation, numberValidation);
```

**Example Form:**
```tsx
import { 
  FormSection, 
  TextInput, 
  NumberInput, 
  Switch,
  ValidationUtils 
} from '@/components';

function MyConfigForm() {
  const [name, setName] = useState('');
  const [size, setSize] = useState(10);
  const [enabled, setEnabled] = useState(true);
  
  const nameValidation = ValidationUtils.required(name, 'Name');
  const sizeValidation = ValidationUtils.number(size, { min: 1, max: 100 }, 'Size');
  
  return (
    <FormSection title="Basic Settings" collapsible>
      <TextInput
        label="Configuration Name"
        value={name}
        onChange={setName}
        required
        validation={nameValidation}
      />
      
      <NumberInput
        label="Size"
        value={size}
        onChange={setSize}
        range={{ min: 1, max: 100 }}
        unit="px"
        validation={sizeValidation}
      />
      
      <Switch
        label="Enable Feature"
        checked={enabled}
        onChange={setEnabled}
        description="Toggle this feature on or off"
      />
    </FormSection>
  );
}
```

## Configuration Import/Export

The system supports importing and exporting configuration as JSON files:

**Export Configuration:**
```tsx
// Export happens automatically via the EngineConfigPanel export button
// Or programmatically:
import { exportConfiguration } from './EngineConfigPanel';

const configJson = exportConfiguration(currentConfig);
console.log(configJson); // JSON string ready for download
```

**Import Configuration:**
```tsx
// Import happens via file picker in EngineConfigPanel
// Or programmatically:
import { importConfiguration } from './EngineConfigPanel';

const importedConfig = importConfiguration(jsonString);
if (importedConfig) {
  setConfiguration(importedConfig);
}
```

**Configuration File Format:**
```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "config": {
    "selectedEngine": "webgl",
    "autoSwitchEnabled": true,
    "engineConfigs": {
      "svg": { /* SVG configuration */ },
      "webgl": { /* WebGL configuration */ }
    }
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "engineCapabilities": [
      {
        "type": "webgl",
        "available": true,
        "capabilities": { /* Engine capabilities */ }
      }
    ]
  }
}
```

## Configuration Presets

### SVG Presets
- **High Quality** - Maximum precision and quality
- **Web Optimized** - Balanced for web delivery
- **Minimal Size** - Smallest file size

### WebGL Presets
- **Performance** - Maximum frame rate and responsiveness
- **High Quality** - Best visual quality with all effects
- **Balanced** - Good balance of performance and quality

**Usage:**
```tsx
import { svgConfigPresets, webglConfigPresets } from '@/components';

// Load SVG preset
const highQualitySVG = svgConfigPresets['high-quality'].config;

// Load WebGL preset
const balancedWebGL = webglConfigPresets['balanced'].config;
```

## Accessibility Features

All form controls include proper accessibility features:
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Focus management
- Error announcements

## Validation System

The validation system provides:
- **Real-time validation** - Immediate feedback on input
- **Multi-level messages** - Errors and warnings
- **Field-specific validation** - Contextual rules
- **Combined validation** - Multiple validators per field

**Validation Types:**
- Required field validation
- Number range validation
- Color format validation
- Custom validation rules

## Performance Considerations

- **Lazy Loading** - Engine-specific configs load only when needed
- **Debounced Updates** - Prevents excessive re-renders during typing
- **Memory Management** - Proper cleanup of resources
- **Optimized Rendering** - Minimal re-renders on value changes

## Browser Compatibility

- **WebGL Support** - Automatic fallback for unsupported features
- **Color Picker** - Graceful degradation for older browsers
- **File Import/Export** - Modern File API with fallbacks
- **Local Storage** - Automatic persistence of settings

## Integration with Graph Engine Provider

The configuration system integrates seamlessly with the existing graph engine provider:

```tsx
import { EngineConfigPanel } from '@/components';
import { GraphEngineProvider } from '../graph-engines/provider';

function GraphApp() {
  return (
    <GraphEngineProvider>
      <div>
        <GraphVisualization />
        <EngineConfigPanel 
          onChange={(config) => {
            // Configuration automatically syncs with provider
            console.log('Updated engine config:', config);
          }}
        />
      </div>
    </GraphEngineProvider>
  );
}
```

## Styling and Theming

The components use CSS custom properties for consistent theming:

```css
:root {
  --color-text: #1f2937;
  --color-muted: #6b7280;
  --color-background: #f9fafb;
  --color-cardBackground: #ffffff;
  --color-border: #e5e7eb;
  --color-primary: #3b82f6;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
}
```

All components respect the existing design system and color scheme automatically.

## Future Enhancements

Potential improvements and extensions:
- **Visual Preview** - Live preview of configuration changes
- **Configuration Validation** - Schema-based validation
- **Plugin System** - Custom engine configuration plugins
- **Cloud Sync** - Synchronize settings across devices
- **Version Control** - Track configuration changes over time
- **Templates** - Save and share configuration templates
- **Performance Profiling** - Real-time performance impact analysis

## Troubleshooting

**Common Issues:**

1. **Import Fails** - Check JSON format and schema version
2. **Validation Errors** - Review field requirements and ranges
3. **Performance Issues** - Reduce settings complexity or use presets
4. **Browser Compatibility** - Check feature support and enable fallbacks

**Debug Mode:**
```tsx
<EngineConfigPanel
  onChange={(config) => {
    console.log('Config updated:', config);
  }}
  onValidationChange={(validation) => {
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      console.warn('Validation warnings:', validation.warnings);
    }
  }}
/>
```