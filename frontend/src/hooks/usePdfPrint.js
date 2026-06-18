import { useCallback, useState } from 'react';
import { pdf } from '@react-pdf/renderer';

/**
 * Simple helper hook to generate a PDF document (React-PDF) and either print it or download it.
 * Accepts a factory that returns a <Document /> element and an optional filename (without .pdf).
 */
export const usePdfPrint = ({ createDocument, fileName = 'document' }) => {
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getFileName = useCallback(() => {
    if (!fileName) return 'document.pdf';
    return fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  }, [fileName]);

  const print = useCallback(async () => {
    setPrinting(true);
    try {
      const blob = await pdf(createDocument()).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      const cleanup = () => {
        try {
          URL.revokeObjectURL(blobUrl);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch (cleanupError) {
          console.warn('PDF print cleanup error:', cleanupError?.message || cleanupError);
        }
      };

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Error triggering print for PDF iframe:', err?.message || err);
        } finally {
          setTimeout(cleanup, 1500);
        }
      };

      iframe.onerror = (err) => {
        console.error('Error loading PDF iframe:', err);
        cleanup();
      };
    } catch (error) {
      console.error('Failed to generate PDF for printing:', error?.message || error);
      // Error already logged to console - let UI handle the error
    } finally {
      setPrinting(false);
    }
  }, [createDocument]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const blob = await pdf(createDocument()).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName();
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
          if (link.parentNode) {
            link.remove();
          }
        } catch (cleanupError) {
          console.warn('PDF download cleanup error:', cleanupError?.message || cleanupError);
        }
      }, 400);
    } catch (error) {
      console.error('Failed to generate PDF for download:', error?.message || error);
      // Error already logged to console - let UI handle the error
    } finally {
      setDownloading(false);
    }
  }, [createDocument, getFileName]);

  return {
    print,
    download,
    printing,
    downloading,
  };
};

export default usePdfPrint;
