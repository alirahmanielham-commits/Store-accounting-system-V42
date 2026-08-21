head -n 437 src/components/payroll/PayrollSettings.tsx > temp.tsx
cat << 'INNEREOF' >> temp.tsx
                            <div className="flex flex-wrap items-center justify-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 flex-1">
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isTaxExempt || false} onChange={e => updateTemplateItem(item.key, 'isTaxExempt', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                معاف از مالیات
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={templateForm.items[item.key]?.isInsuranceExempt || false} onChange={e => updateTemplateItem(item.key, 'isInsuranceExempt', e.target.checked)} className="rounded text-indigo-600 w-3.5 h-3.5" />
                                معاف از بیمه
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
INNEREOF
mv temp.tsx src/components/payroll/PayrollSettings.tsx
