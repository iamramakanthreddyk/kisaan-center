/**
 * Formatting Utilities
 * Comprehensive formatting functions for display and API responses
 */


/**
 * Number Formatting
 */
export class NumberFormatter {
  /**
   * Format currency with proper decimal places
   */
  static currency(amount: number, currency: string = 'INR', locale: string = 'en-IN'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format decimal with specified precision
   */
  static decimal(value: number, precision: number = 2): string {
    return value.toFixed(precision);
  }

  /**
   * Format large numbers with K, M, B suffixes
   */
  static abbreviate(value: number): string {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B';
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  /**
   * Format percentage
   */
  static percentage(value: number, precision: number = 2): string {
    return (value * 100).toFixed(precision) + '%';
  }

  /**
   * Format with thousand separators
   */
  static withSeparators(value: number, locale: string = 'en-IN'): string {
    return new Intl.NumberFormat(locale).format(value);
  }
}

/**
 * Date/Time Formatting
 */
export class DateFormatter {
  /**
   * Format date for display
   */
  static displayDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  }

  /**
   * Format datetime for display
   */
  static displayDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format date for ISO string
   */
  static toISODate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * Format datetime for ISO string
   */
  static toISODateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  static relativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }

  /**
   * Format time duration
   */
  static duration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  /**
   * Get start and end of day
   */
  static dayRange(date: Date | string): { start: Date; end: Date } {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
    const start = new Date(dateObj);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(dateObj);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }
}

/**
 * String Formatting
 */
export class StringFormatter {
  /**
   * Capitalize first letter
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Convert to title case
   */
  static titleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Convert to camelCase
   */
  static camelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  /**
   * Convert to snake_case
   */
  static snakeCase(str: string): string {
    return str.replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  }

  /**
   * Convert to kebab-case
   */
  static kebabCase(str: string): string {
    return str.replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('-');
  }

  /**
   * Sanitize input string for security
   */
  static sanitizeInput(str: string): string {
    return str
      .trim()
  .replace(/[<>"'&]/g, '') // Remove basic HTML/XSS characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Generate slug from string
   */
  static slug(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Mask sensitive data
   */
  static mask(str: string, visibleStart: number = 3, visibleEnd: number = 3, maskChar: string = '*'): string {
    if (str.length <= visibleStart + visibleEnd) {
      return maskChar.repeat(str.length);
    }
    
    const start = str.substring(0, visibleStart);
    const end = str.substring(str.length - visibleEnd);
    const middle = maskChar.repeat(str.length - visibleStart - visibleEnd);
    
    return start + middle + end;
  }

  /**
   * Extract initials from name
   */
  static initials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 3);
  }
}

/**
 * Array Formatting
 */
export class ArrayFormatter {
  /**
   * Join array with proper grammar
   */
  static naturalJoin(items: string[], separator: string = ', ', lastSeparator: string = ' and '): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(lastSeparator);
    
    const lastItem = items.pop();
    return items.join(separator) + lastSeparator + lastItem;
  }

  /**
   * Group array items by key
   */
  static groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Format array as bullet points
   */
  static bulletList(items: string[]): string {
    return items.map(item => `• ${item}`).join('\n');
  }

  /**
   * Format array as numbered list
   */
  static numberedList(items: string[]): string {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }
}

/**
 * Object Formatting
 */
export class ObjectFormatter {
  /**
   * Remove null/undefined values from object
   */
  static removeEmpty(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Flatten nested object
   */
  static flatten(obj: Record<string, unknown>, prefix: string = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flatten(value as Record<string, unknown>, newKey));
      } else {
        result[newKey] = value;
      }
    }
    
    return result;
  }

  /**
   * Pick specific keys from object
   */
  static pick<T extends Record<string, unknown>, K extends keyof T>(
    obj: T, 
    keys: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }

  /**
   * Omit specific keys from object
   */
  static omit<T extends Record<string, unknown>, K extends keyof T>(
    obj: T, 
    keys: K[]
  ): Omit<T, K> {
    const result = { ...obj };
    
    for (const key of keys) {
      delete result[key];
    }
    
    return result as Omit<T, K>;
  }
}

/**
 * Address Formatting
 */
export class AddressFormatter {
  /**
   * Format full address
   */
  static fullAddress(components: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }): string {
    const parts = [
      components.street,
      components.city,
      components.state,
      components.postalCode,
      components.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Format short address
   */
  static shortAddress(components: {
    city?: string;
    state?: string;
  }): string {
    const parts = [components.city, components.state].filter(Boolean);
    return parts.join(', ');
  }
}

/**
 * File Size Formatting
 */
export class FileSizeFormatter {
  /**
   * Format bytes to human readable size
   */
  static humanReadable(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }
}

/**
 * Export all formatters
 */
export const Formatters = {
  Number: NumberFormatter,
  Date: DateFormatter,
  String: StringFormatter,
  Array: ArrayFormatter,
  Object: ObjectFormatter,
  Address: AddressFormatter,
  FileSize: FileSizeFormatter
};