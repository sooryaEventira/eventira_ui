import React, { useMemo } from 'react';

export interface HTMLContentProps {
  htmlContent: string | React.ReactElement;
  id?: string;
}

const HTMLContent: React.FC<HTMLContentProps> = ({ htmlContent, id }) => {
  const getStringValue = (prop: string | React.ReactElement): string => {
    if (typeof prop === 'string') return prop;
    if (prop && typeof prop === 'object' && 'props' in prop && prop.props && 'value' in prop.props) {
      return prop.props.value || '';
    }
    return '';
  };

  const normalizeHtml = (rawHtml: string): string => {
    const raw = (rawHtml || '').trim();
    if (!raw) return '';
    if (typeof window === 'undefined') {
      return raw.replace(/<\/?(html|head|body)[^>]*>/gi, '').trim();
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(raw, 'text/html');
      const bodyHtml = (doc.body?.innerHTML || '').trim();
      const styleTags = Array.from(doc.querySelectorAll('style'))
        .map((style) => style.outerHTML)
        .join('\n')
        .trim();
      if (!styleTags) return bodyHtml || raw;
      return `${styleTags}\n${bodyHtml || raw}`.trim();
    } catch {
      return raw;
    }
  };

  const htmlContentValue = useMemo(
    () => normalizeHtml(getStringValue(htmlContent)),
    [htmlContent]
  );

  return (
    <div 
      id={id}
      className="w-full h-auto min-h-0 relative"
    >
      <div
        dangerouslySetInnerHTML={{ __html: htmlContentValue }}
        className="w-full h-auto min-h-0 relative"
      />
    </div>
  );
};

export default HTMLContent;
