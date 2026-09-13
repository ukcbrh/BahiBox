import React from 'react';
import { renderBillHtml, renderLabelHtml, BillBlock, BillData, LabelData } from '@/src/lib/billRenderer';

interface BillPreviewProps {
  blocks: BillBlock[];
  printerSize: string;
  data?: BillData;
  labelData?: LabelData;
  labelWidthMm?: number;
  labelHeightMm?: number;
}

export default function BillPreview({ blocks, printerSize, data, labelData, labelWidthMm, labelHeightMm }: BillPreviewProps) {
  const html = labelData
    ? renderLabelHtml(blocks, labelData, labelWidthMm || 40, labelHeightMm || 25)
    : renderBillHtml(blocks, data as BillData, printerSize);
  return (
    <div className="flex justify-center bg-slate-100 dark:bg-slate-900 p-4 overflow-auto">
      <div
        className="shadow-md"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
