import React, { Suspense } from 'react';

const ChangelogModal = React.lazy(() => import('../ChangelogModal').catch(() => ({ default: () => null })));
const ReceiveReceiptModal = React.lazy(() => import('../financial/ReceiveReceiptModal').catch(() => ({ default: () => null })));
const PayReceiptModal = React.lazy(() => import('../financial/PayReceiptModal').catch(() => ({ default: () => null })));
const MinimalMobilePersonModal = React.lazy(() => import('./MinimalMobilePersonModal').catch(() => ({ default: () => null })));
const ProductPriceChangeModal = React.lazy(() => import('./ProductPriceChangeModal').catch(() => ({ default: () => null })));
const ProductPriceHistoryModal = React.lazy(() => import('./ProductPriceHistoryModal').catch(() => ({ default: () => null })));
const GroupPriceUpdateWizard = React.lazy(() => import('./GroupPriceUpdateWizard').catch(() => ({ default: () => null })));
const PrintBarcodeModal = React.lazy(() => import('./PrintBarcodeModal').catch(() => ({ default: () => null })));
const BarcodeScannerModal = React.lazy(() => import('./BarcodeScannerModal').catch(() => ({ default: () => null })));
const EditReceiptModal = React.lazy(() => import('./EditReceiptModal').catch(() => ({ default: () => null })));
const AIProductSearchModal = React.lazy(() => import('../products/AIProductSearchModal').catch(() => ({ default: () => null })));
const GenerateBarcodesModal = React.lazy(() => import('./GenerateBarcodesModal').catch(() => ({ default: () => null })));
const PersonExtraModal = React.lazy(() => import('./PersonExtraModal').catch(() => ({ default: () => null })));


export default function ExtraModals(props: any) {
  const {
    isChangelogModalOpen, setIsChangelogModalOpen,
    isReceiveReceiptModalOpen, setIsReceiveReceiptModalOpen,
    isPayReceiptModalOpen, setIsPayReceiptModalOpen,
    isMinimalPersonModalOpen, setIsMinimalPersonModalOpen,
    isProductPriceChangeModalOpen, setIsProductPriceChangeModalOpen,
    isPrintBarcodeModalOpen, setIsPrintBarcodeModalOpen,
    isBarcodeScannerModalOpen, setIsBarcodeScannerModalOpen,
    isEditReceiptModalOpen, setIsEditReceiptModalOpen,
    isAIProductSearchModalOpen, setIsAIProductSearchModalOpen,
    isGenerateBarcodesModalOpen, setIsGenerateBarcodesModalOpen,
    isPersonExtraModalOpen, setIsPersonExtraModalOpen,
    historyProductId, setHistoryProductId,
    invoices, isGroupPriceModalOpen, setIsGroupPriceModalOpen, groupUpdateType, setGroupUpdateType, selectedProductIds, setSelectedProductIds, productCategories, storeSettings,
    personExtraId,
    barcodeFormat, setBarcodeFormat, barcodePrefix, setBarcodePrefix, barcodeLength, setBarcodeLength, handleGenerateBarcodes,
    
    // Other props for modals
    receiptPersonId, setReceiptPersonId,
    receiptInvoiceId, setReceiptInvoiceId,
    receiptAmount, setReceiptAmount,
    receiptMethod, setReceiptMethod,
    receiptDate, setReceiptDate,
    receiptCheckNumber, setReceiptCheckNumber,
    receiptCheckDueDate, setReceiptCheckDueDate,
    receiptCheckBankName, setReceiptCheckBankName,
    receiptCheckbookId, setReceiptCheckbookId,
    receiptNote, setReceiptNote,
    submittingReceipt, handleReceiptSubmit,
    persons, formatCurrency, toPersianDigits, numToPersianWords,
    accounts, cashboxes, checkbooks, confirmAction,
    editingReceipt, updateTransaction, showNotification,
    editingProductId, products, saveProductData, fetchProducts,
    handleBarcodeScan,
    handleAIAssist
  } = props;

  return (
    <Suspense fallback={null}>
      {isChangelogModalOpen && (
        <ChangelogModal isOpen={isChangelogModalOpen} onClose={() => setIsChangelogModalOpen(false)} />
      )}
      
      {isReceiveReceiptModalOpen && (
        <ReceiveReceiptModal
          isOpen={isReceiveReceiptModalOpen}
          onClose={() => setIsReceiveReceiptModalOpen(false)}
          personId={receiptPersonId}
          setPersonId={setReceiptPersonId}
          invoiceId={receiptInvoiceId}
          amount={receiptAmount}
          setAmount={setReceiptAmount}
          method={receiptMethod}
          setMethod={setReceiptMethod}
          date={receiptDate}
          setDate={setReceiptDate}
          checkNumber={receiptCheckNumber}
          setCheckNumber={setReceiptCheckNumber}
          checkDueDate={receiptCheckDueDate}
          setCheckDueDate={setReceiptCheckDueDate}
          checkBankName={receiptCheckBankName}
          setCheckBankName={setReceiptCheckBankName}
          note={receiptNote}
          setNote={setReceiptNote}
          handleSubmitReceipt={handleReceiptSubmit}
          submittingReceipt={submittingReceipt}
          persons={persons}
          formatCurrency={formatCurrency}
          toPersianDigits={toPersianDigits}
          numToPersianWords={numToPersianWords}
          accounts={accounts}
          cashboxes={cashboxes}
          storeSettings={storeSettings}
        />
      )}

      {isPayReceiptModalOpen && (
        <PayReceiptModal
          isOpen={isPayReceiptModalOpen}
          onClose={() => setIsPayReceiptModalOpen(false)}
          personId={receiptPersonId}
          setPersonId={setReceiptPersonId}
          invoiceId={receiptInvoiceId}
          amount={receiptAmount}
          setAmount={setReceiptAmount}
          method={receiptMethod}
          setMethod={setReceiptMethod}
          date={receiptDate}
          setDate={setReceiptDate}
          checkNumber={receiptCheckNumber}
          setCheckNumber={setReceiptCheckNumber}
          checkDueDate={receiptCheckDueDate}
          setCheckDueDate={setReceiptCheckDueDate}
          checkbookId={receiptCheckbookId}
          setCheckbookId={setReceiptCheckbookId}
          note={receiptNote}
          setNote={setReceiptNote}
          handleSubmitReceipt={handleReceiptSubmit}
          submittingReceipt={submittingReceipt}
          persons={persons}
          formatCurrency={formatCurrency}
          toPersianDigits={toPersianDigits}
          numToPersianWords={numToPersianWords}
          accounts={accounts}
          cashboxes={cashboxes}
          checkbooks={checkbooks}
          storeSettings={storeSettings}
        />
      )}

      {isMinimalPersonModalOpen && (
        <MinimalMobilePersonModal
          isOpen={isMinimalPersonModalOpen}
          onClose={() => setIsMinimalPersonModalOpen(false)}
          onSuccess={() => setIsMinimalPersonModalOpen(false)}
        />
      )}

      {isProductPriceChangeModalOpen && editingProductId && (
        <ProductPriceChangeModal
          currency={storeSettings?.currency || "تومان"}
          onClose={() => {
            setIsProductPriceChangeModalOpen(false);
          }}
          product={editingProductId ? products.find((p: any) => p.id === editingProductId) : undefined}
          onSuccess={async () => {
              await fetchProducts();
              setIsProductPriceChangeModalOpen(false);
              showNotification("قیمت محصول با موفقیت بروزرسانی شد", "success");
          }}
          showNotification={showNotification}
        />
      )}

      
      {((isPrintBarcodeModalOpen && editingProductId) || props.printingBarcodeProduct) ? (
        <PrintBarcodeModal
          product={editingProductId ? products.find((p: any) => p.id === editingProductId) : (Array.isArray(props.printingBarcodeProduct) ? undefined : props.printingBarcodeProduct)}
          products={Array.isArray(props.printingBarcodeProduct) ? props.printingBarcodeProduct : undefined}
          onClose={() => {
             setIsPrintBarcodeModalOpen(false);
             if (props.setPrintingBarcodeProduct) props.setPrintingBarcodeProduct(null);
          }}
          storeSettings={storeSettings}
        />
      ) : null}


      {isBarcodeScannerModalOpen && (
        <BarcodeScannerModal
          onClose={() => setIsBarcodeScannerModalOpen(false)}
          onScan={handleBarcodeScan}
        />
      )}

      {isEditReceiptModalOpen && editingReceipt && (
        <EditReceiptModal
          isOpen={isEditReceiptModalOpen}
          onClose={() => setIsEditReceiptModalOpen(false)}
          receipt={editingReceipt}
          persons={persons}
          accounts={accounts}
          cashboxes={cashboxes}
          checkbooks={checkbooks}
          storeSettings={storeSettings}
          showNotification={showNotification}
          confirmAction={confirmAction}
          onSave={async (data: any) => {
             if (props.handleSaveReceipt) {
               await props.handleSaveReceipt(data);
             }
             setIsEditReceiptModalOpen(false);
          }}
        />
      )}

      {isAIProductSearchModalOpen && (
        <AIProductSearchModal
          isOpen={isAIProductSearchModalOpen}
          onClose={() => setIsAIProductSearchModalOpen(false)}
          categories={productCategories || []}
          onAddProducts={(newProducts, categoryId) => {
            if (handleAIAssist) handleAIAssist(newProducts, categoryId);
            setIsAIProductSearchModalOpen(false);
          }}
        />
      )}
      {isPersonExtraModalOpen && (
        <PersonExtraModal
          isOpen={isPersonExtraModalOpen}
          onClose={() => setIsPersonExtraModalOpen(false)}
          personId={personExtraId}
          persons={persons}
          onSuccess={async () => {
             if (props.fetchPersons) props.fetchPersons();
          }}
          showNotification={showNotification}
        />
      )}
      {isGenerateBarcodesModalOpen && (
        <GenerateBarcodesModal
          isOpen={isGenerateBarcodesModalOpen}
          onClose={() => setIsGenerateBarcodesModalOpen(false)}
          barcodeFormat={barcodeFormat}
          setBarcodeFormat={setBarcodeFormat}
          barcodePrefix={barcodePrefix}
          setBarcodePrefix={setBarcodePrefix}
          barcodeLength={barcodeLength}
          setBarcodeLength={setBarcodeLength}
          products={props.products}
          handleGenerateBarcodes={async () => {
            await handleGenerateBarcodes();
            setIsGenerateBarcodesModalOpen(false);
          }}
        />
      )}
      
      {historyProductId && (
        <ProductPriceHistoryModal
          isOpen={!!historyProductId}
          onClose={() => { if(props.setHistoryProductId) props.setHistoryProductId(null); }}
          productId={historyProductId}
          products={props.products}
          invoices={invoices}
          formatCurrency={props.formatCurrency}
          toPersianDigits={props.toPersianDigits}
        />
      )}
      {isGroupPriceModalOpen && (
        <GroupPriceUpdateWizard
          products={props.products}
          productCategories={productCategories}
          initialSelectedIds={groupUpdateType === 'selected' ? selectedProductIds : []}
          currency={storeSettings?.currency || "تومان"}
          onClose={() => setIsGroupPriceModalOpen(false)}
          onSave={async (items) => {
            if (props.handleGroupPriceUpdate) {
              await props.handleGroupPriceUpdate(items);
            }
          }}
        />
      )}

      </Suspense>
  );
}
