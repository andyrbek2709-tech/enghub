import React, { useState } from 'react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { calcRegistry } from './registry';
import { exportToDocx } from './DocxExporter';

export const CalculationView = ({ calcId, C }: { calcId: string, C: any }) => {
  const template = calcRegistry[calcId];
  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (template) template.inputs.forEach(inp => init[inp.id] = inp.defaultValue ?? 0);
    return init;
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calcResult, setCalcResult] = useState<any>(null);

  // Global unit converter state for this calculation
  const [showConverter, setShowConverter] = useState(false);
  const [convValue, setConvValue] = useState(1);
  const [convType, setConvType] = useState("length"); // length, pressure, power

  if (!template) return <div style={{ padding: 40, color: C.textDim, textAlign: "center" }}>Выберите расчет из списка слева</div>;

  const handleInputChange = (id: string, value: string) => {
    const num = parseFloat(value);
    setInputs(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
    
    // Validate live
    const inpDef = template.inputs.find(i => i.id === id);
    if (!inpDef) return;
    
    let err = "";
    if (inpDef.min !== undefined && num < inpDef.min) err = `Мин: ${inpDef.min}. ${inpDef.hint || ""}`;
    if (inpDef.max !== undefined && num > inpDef.max) err = `Макс: ${inpDef.max}. ${inpDef.hint || ""}`;
    
    setErrors(prev => ({ ...prev, [id]: err }));
  };

  const handleCalculate = () => {
    if (Object.values(errors).some(e => e !== "")) {
      alert("Исправьте ошибки в исходных данных перед расчетом.");
      return;
    }
    const result = template.calculate(inputs);
    setCalcResult(result);
  };

  const handleExport = () => {
    if (!calcResult) return;
    exportToDocx(template, inputs, calcResult.results, calcResult.report);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", position: "relative" }}>
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{template.name}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{template.desc} | {template.normativeReference}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowConverter(!showConverter)} style={{ background: showConverter ? C.surface2 : "transparent" }}>
          🔄 Конвертер величин
        </button>
      </div>
      
      {/* GLOBAL UNIT CONVERTER PANE */}
      {showConverter && (
        <div style={{ background: C.surface2, padding: "16px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Быстрый перевод:</div>
          <select value={convType} onChange={e => setConvType(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.text }}>
            <option value="length">Длина (м ↔ мм)</option>
            <option value="pressure">Давление (МПа ↔ кПа ↔ бар)</option>
            <option value="power">Мощность (кВт ↔ Вт)</option>
            <option value="mass">Масса (т ↔ кг)</option>
          </select>
          <input type="number" value={convValue} onChange={e => setConvValue(parseFloat(e.target.value) || 0)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.text, width: 100 }} />
          
          <div style={{ display: "flex", gap: 12, alignItems: "center", color: C.text, fontSize: 14 }}>
            <span>=</span>
            {convType === "length" && <span style={{ fontWeight: 600 }}>{convValue * 1000} мм (или {convValue / 1000} км)</span>}
            {convType === "pressure" && <span style={{ fontWeight: 600 }}>{convValue * 1000} кПа / {convValue * 10} бар / {convValue * 10197.16} кгс/м²</span>}
            {convType === "power" && <span style={{ fontWeight: 600 }}>{convValue * 1000} Вт</span>}
            {convType === "mass" && <span style={{ fontWeight: 600 }}>{convValue * 1000} кг</span>}
          </div>
          <button style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.textMuted, cursor: "pointer" }} onClick={() => setShowConverter(false)}>✕</button>
        </div>
      )}
      
      <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 32, maxWidth: 1000 }}>
        
        {/* INPUT FORM */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 24, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 20 }}>1. Исходные данные</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {template.inputs.map(inp => (
              <div key={inp.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: C.textDim, fontWeight: 500 }}>
                  {inp.name} {inp.unit ? `[${inp.unit}]` : ""}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    type="number" 
                    value={inputs[inp.id] ?? 0} 
                    onChange={e => handleInputChange(inp.id, e.target.value)}
                    style={{ 
                      flex: 1, padding: "10px 14px", borderRadius: 8, 
                      border: `1.5px solid ${errors[inp.id] ? C.red : C.border}`, 
                      background: C.surface2, color: C.text, outline: "none",
                      fontSize: 15
                    }} 
                  />
                </div>
                {errors[inp.id] && <div style={{ fontSize: 11, color: C.red }}>{errors[inp.id]}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn btn-primary" onClick={handleCalculate} style={{ padding: "12px 32px", fontSize: 15, borderRadius: 8 }}>
              🚀 Выполнить расчет
            </button>
          </div>
        </div>

        {/* RESULTS DISPLAY */}
        {calcResult && (
          <div style={{ background: C.green + "08", border: `1px solid ${C.green}30`, padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>2. Результаты и Отчет</div>
              <button className="btn btn-ghost" onClick={handleExport} style={{ border: `1px solid ${C.green}`, color: C.green }}>
                📥 Скачать .docx отчет
              </button>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24, paddingBottom: 24, borderBottom: `1px dashed ${C.border}` }}>
              {Object.values(calcResult.results).map((r: any, i) => (
                <div key={i} style={{ background: C.surface, padding: "16px 24px", borderRadius: 8, border: `1px solid ${C.border}`, flex: "1 1 min-content" }}>
                  <div style={{ fontSize: 13, color: C.textDim, marginBottom: 8 }}>{r.label}:</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{r.value} <span style={{ fontSize: 16, color: C.textMuted, fontWeight: 500 }}>{r.unit}</span></div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {calcResult.report.map((step: any, i: number) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, background: C.surface, padding: 20, borderRadius: 8, border: `1px solid ${C.border}50` }}>
                  {step.title && <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{step.title}</div>}
                  {step.text && <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.5 }}>{step.text}</div>}
                  {step.formulaLatex && (
                    <div style={{ padding: "16px 0", textAlign: "center", fontSize: 18, color: C.accent, overflowX: "auto" }}>
                      <Latex>{`$$${step.formulaLatex}$$`}</Latex>
                    </div>
                  )}
                  {step.formulaSubstitutedLatex && (
                    <div style={{ padding: "12px 0", textAlign: "center", fontSize: 16, color: C.text, overflowX: "auto" }}>
                      <Latex>{`$$${step.formulaSubstitutedLatex}$$`}</Latex>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
