/**
 * Mobile Responsiveness Guidelines for KisaanCenter
 * 
 * Use this guide to make pages mobile-friendly for future mobile app conversion
 */

// 1. IMPORT MOBILE HOOKS
// import { useIsMobile, useIsSmallMobile } from '../hooks/useMediaQuery';

// 2. USE IN COMPONENT
// const isMobile = useIsMobile();
// const isSmallMobile = useIsSmallMobile();

// 3. RESPONSIVE PATTERNS

// Header Layout (replace fixed headers with responsive ones):
/*
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
  <div>
    <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
      Page Title
    </h1>
    <p className="text-gray-600 text-sm sm:text-base">Subtitle</p>
  </div>
  <div className="flex gap-2 flex-wrap">
    <Button size={isMobile ? "sm" : "default"} className="flex-1 sm:flex-none">
      <Icon className="w-4 h-4 mr-2" />
      {isSmallMobile ? "Short" : "Long Text"}
    </Button>
  </div>
</div>
*/

// Table vs Cards Pattern:
/*
{/* Mobile Cards *\/}
<div className="block md:hidden space-y-3">
  {items.map((item) => (
    <Card key={item.id} className="overflow-hidden border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{item.name}</h3>
            <p className="text-sm text-gray-500">ID #{item.id}</p>
          </div>
          <Badge>{item.status}</Badge>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Icon className="w-4 h-4 text-gray-400" />
            <span>{item.detail}</span>
          </div>
        </div>
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Button size="sm" className="flex-1">Action</Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

{/* Desktop Table *\/}
<div className="hidden md:block">
  <Table>
    {/* Regular table content *\/}
  </Table>
</div>
*/

// Filter Responsiveness:
/*
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
  <div className="relative sm:col-span-2 lg:col-span-1">
    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
    <Input placeholder={isSmallMobile ? "Search..." : "Search items..."} />
  </div>
  <Select>...</Select>
  <Select>...</Select>
</div>
*/

// Page Padding:
/*
<div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 sm:space-y-6`}>
  Content
</div>
*/

// Common Breakpoints:
// - sm: 640px (small tablets)
// - md: 768px (tablets)
// - lg: 1024px (small laptops)
// - xl: 1280px (laptops)
// - 2xl: 1536px (large screens)

// Mobile-First Classes:
// - Use mobile styles by default
// - Add sm:, md:, lg: prefixes for larger screens
// - Example: "text-sm sm:text-base md:text-lg"

export {};