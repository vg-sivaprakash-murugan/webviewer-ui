import React, { useEffect, useRef, useState } from "react";
import WebViewer from "@pdftron/webviewer";
import FieldModal from "./FieldModal";
import SmartPagination from "./SmartPagination";
import { useSelector, useDispatch } from 'react-redux';
import selectors from 'selectors';
import actions from 'actions';
import core from 'core';

function normalizePages(rawPages) {
  return rawPages
    .map((p) => ({
      ...p,
      number: p.properties.pageNumber,
    }));
}


function extractText(contents) {
  return contents
    .flatMap((c) =>
      c.type === "paragraph"
        ? (c.contents ?? []).map((span) => span.text ?? "")
        : []
    )
    .join(" ")
    .trim();
}

const FORM_TYPES = ["Dropdown", "Checkbox", "Radio", "Textbox"];

const WebViewerComponent = () => {
  const dispatch = useDispatch();
  const [activeTable, setActiveTable] = useState(null);
  const viewerDiv = useRef(null);
  const annotManagerRef = useRef(null);
  const AnnotationsRef = useRef(null);
  const instanceRef = useRef(null);
  const [pageOffset, setPageOffset] = useState(0);
  const PAGE_LIMIT = 10;
  const [currentPageBatch, setCurrentPageBatch] = useState(0);
  const [visiblePageRange, setVisiblePageRange] = useState({ start: 0, end: PAGE_LIMIT });
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [dropdownOptions, setDropdownOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});

  const [tables, setTables] = useState([]);
  const startIndex = currentPageBatch * PAGE_LIMIT;
  const endIndex = startIndex + PAGE_LIMIT;
  const [addedHeaders, setAddedHeaders] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [activeHeader, setActiveHeader] = useState(null);


  const [selectedTypes, setSelectedTypes] = useState({});
  const isInDesktopOnlyMode = useSelector(selectors.isInDesktopOnlyMode);
  const rawTableData = useSelector(selectors.getPdfJson);

  const normalizedPages = normalizePages((rawTableData).pages);

  const tableData = normalizedPages.map((page, pageIndex) => {
    const tables = (page.elements ?? []).filter((el) => el.type === "table");
    return {
      PageNumber: page.number ?? pageIndex + 1,
      Tables: tables.map((table, tableIndex) => {

        const headers = (table.headers ?? []).map((h, i) => {
          const [x1, y1, x2, y2] = h.rect ?? [0, 0, 0, 0];
          return {
            Id: `p${pageIndex}t${tableIndex}h${i}`,
            Header: h.text ?? "",
            X: x1,
            Y: y1,
            CellWidth: x2 - x1,
            CellHeight: y2 - y1,
            Fragments: [{ Text: h.text ?? "" }],
          };
        });

        const rows = (table.trs ?? [])
          .slice(1)
          .map((tr, rowIndex) => {
            return (tr.tds ?? []).map((td, cellIndex) => {
              const [x1, y1, x2, y2] = td.rect ?? [0, 0, 0, 0];
              const text = extractText(td.contents ?? []);

              const nestedTables = (td.elements ?? []).filter((el) => el.type === "table");

              return {
                Id: `p${pageIndex}t${tableIndex}r${rowIndex}c${cellIndex}`,
                Header: td.headerName ?? "",
                X: x1,
                Y: y1,
                CellWidth: x2 - x1,
                CellHeight: y2 - y1,
                Fragments: [{ Text: text }],
                NestedTables: nestedTables.map((nt, ntIndex) => {
                  const headers = (nt.headers ?? []).map((h, i) => {
                    const [hx1, hy1, hx2, hy2] = h.rect ?? [0, 0, 0, 0];
                    return {
                      Id: `p${pageIndex}t${tableIndex}nt${ntIndex}h${i}`,
                      Header: h.text ?? "",
                      X: hx1,
                      Y: hy1,
                      CellWidth: hx2 - hx1,
                      CellHeight: hy2 - hy1,
                      Fragments: [{ Text: h.text ?? "" }],
                    };
                  });

                  const rows = (nt.trs ?? []).slice(1).map((ntr, nrIndex) => {
                    return (ntr.tds ?? []).map((ntd, ncIndex) => {
                      const [nx1, ny1, nx2, ny2] = ntd.rect ?? [0, 0, 0, 0];
                      const nestedText = extractText(ntd.contents ?? []);
                      return {
                        Id: `p${pageIndex}t${tableIndex}nt${ntIndex}r${nrIndex}c${ncIndex}`,
                        Header: ntd.headerName ?? "",
                        X: nx1,
                        Y: ny1,
                        CellWidth: nx2 - nx1,
                        CellHeight: ny2 - ny1,
                        Fragments: [{ Text: nestedText }],
                      };
                    });
                  });

                  return { Headers: headers, Rows: rows };
                }),
              };
            });
          });


        return { Headers: headers, Rows: rows };
      }),
    };
  });

  const pagesWithTables = tableData.map((page, pageIndex) => ({
    pageIndex,
    pageNumber: page.PageNumber,
    tables: page.Tables.map((table, tableIndex) => ({
      pageIndex,
      pageNumber: page.PageNumber,
      tableIndex,
      headers: table.Headers.map((h) => h.Header.replace(/\s+/g, " ").trim()),
      rows: table.Rows,
    })),
  }));

  const totalBatches = Math.ceil(pagesWithTables.length / PAGE_LIMIT);

  const currentPages = pagesWithTables.slice(
    currentPageBatch * PAGE_LIMIT,
    (currentPageBatch + 1) * PAGE_LIMIT
  );

  const currentTables = currentPages.flatMap((p) => p.tables);


  useEffect(() => {

    // Initialize WebViewer
    // WebViewer(
    //   {
    //     path: "/webviewer/lib", initialDoc: "/OQ_Agitator_10000.pdf", fullAPI: true, disabledElements: [
    //       'formFieldPanel', 'indexPanel', 'toolbarGroup-Shapes', 'toolbarGroup-Edit', 'toolbarGroup-FillAndSign',
    //       'toolbarGroup-Insert', 'listBoxFieldButton', 'indexPanelListToggle', 'leftPanelButton', 'notesPanelToggle'
    //     ]
    //   },
    //   viewerDiv.current
    // ).then((instance) => {
    //   annotManagerRef.current = instance.Core.annotationManager;
    //   AnnotationsRef.current = instance.Core.Annotations;
    //   instanceRef.current = instance;
    // });

    const tablesWithHeaders = tableData.flatMap((page, pageIndex) =>
      page.Tables.map((table, tableIndex) => ({
        pageIndex,
        pageNumber: page.PageNumber,
        tableIndex,
        headers: table.Headers.map((h) => h.Header.replace(/\s+/g, " ").trim()),
        rows: table.Rows,
      }))
    );
    setTables(tablesWithHeaders);

    const initialTypes = {};
    tablesWithHeaders.forEach((t) =>
      t.headers.forEach((h) => {
        initialTypes[`page${t.pageIndex}_table${t.tableIndex}_header_${h}`] = "Dropdown";
      })
    );
    setSelectedTypes(initialTypes);
  }, []);

  useEffect(() => {
    const start = currentPageBatch * PAGE_LIMIT;
    const end = start + PAGE_LIMIT;
    setVisiblePageRange({ start, end });
  }, [currentPageBatch]);

  useEffect(() => {
    const handleScroll = () => {
      if (!viewerDiv.current) return;
      const { scrollTop, scrollHeight, clientHeight } = viewerDiv.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {

        setVisiblePageRange((prev) => {
          const newStart = prev.end;
          const newEnd = Math.min(newStart + PAGE_LIMIT, tables.length);
          if (newStart >= tables.length) return prev;
          return { start: newStart, end: newEnd };
        });
      }
    };

    viewerDiv.current?.addEventListener("scroll", handleScroll);
    return () => viewerDiv.current?.removeEventListener("scroll", handleScroll);
  }, [tables]);

  useEffect(() => {
    if (activeHeader) {
      addFormToHeader(activeTable?.pageIndex ?? 0, activeTable?.tableIndex ?? 0, activeHeader);
    }
  }, [dropdownOptions]);

  const handleTypeChange = (key, value) => {
    setSelectedTypes((prev) => ({ ...prev, [key]: value }));
    setAddedHeaders((prev) => ({ ...prev, [key]: false }));
  };

  const handleFieldSave = (headerKey, options) => {
    setDropdownOptions(prev => ({
      ...prev,
      [headerKey]: options.map(v => ({ value: v, displayValue: v }))
    }));
  };

  const highlightTableBorder = (pageIndex, tableIndex) => {
    const documentViewer = core.getDocumentViewer();
    if (!documentViewer) return;

    const annotationManager = documentViewer.getAnnotationManager();
    const Annotations = window.Core.Annotations;

    if (!Annotations) {
      console.error("Annotations not available yet!");
      return;
    }

    const existing = annotationManager
      .getAnnotationsList()
      .find(a => a.Subject === "TableBorder");

    if (existing) {
      annotationManager.deleteAnnotation(existing, false, true);
      annotationManager.redrawAnnotation(existing);
    }

    const pageData = tableData[pageIndex];
    const table = pageData?.Tables?.[tableIndex];
    const pageNumber = pageData?.PageNumber;
    if (!table || !pageNumber) return;

    const allCells = [...(table.Headers || []), ...(table.Rows?.flat() || [])];
    if (allCells.length === 0) return;

    const minX = Math.min(...allCells.map(c => c.X));
    const minY = Math.min(...allCells.map(c => c.Y));
    const maxX = Math.max(...allCells.map(c => c.X + c.CellWidth));
    const maxY = Math.max(...allCells.map(c => c.Y + c.CellHeight));

    const rectAnnot = new Annotations.RectangleAnnotation({
      PageNumber: pageNumber,
      X: minX,
      Y: minY,
      Width: maxX - minX,
      Height: maxY - minY,
      Subject: "TableBorder",
    });

    // color changes not applied
    // rectAnnot.StrokeColor = new Annotations.Color(0, 122, 255);
    // rectAnnot.FillColor = new Annotations.Color(255, 255, 0, 0.15);
    rectAnnot.StrokeThickness = 3;
    rectAnnot.ReadOnly = true;
    rectAnnot.Locked = true;
    rectAnnot.NoResize = true;
    rectAnnot.ShowMoveHandles = false;
    rectAnnot.ShowResizeHandles = false;

    annotationManager.addAnnotation(rectAnnot);
    annotationManager.redrawAnnotation(rectAnnot);

    try {
      annotationManager.bringToBack(rectAnnot);
    } catch (e) {
      console.warn("Could not send annotation to back:", e);
    }
  };


  const addFormToHeader = (pageIndex, tableIndex, header) => {
    // if (!annotManagerRef.current || !AnnotationsRef.current || !instanceRef.current) return;

    setActiveTable({ pageIndex, tableIndex });

    const documentViewer = core.getDocumentViewer();
    if (!documentViewer) return;

    const annotationManager = documentViewer.getAnnotationManager();
    const Annotations = window.Core.Annotations;

    const pageData = tableData[pageIndex];
    const table = pageData.Tables[tableIndex];
    const rows = table.Rows;
    const pageNumber = pageData.PageNumber;
    const pageInfo = core.getDocumentViewer().getDocument().getPageInfo(pageNumber);
    const pageHeight = pageInfo.height;

    const key = `page${pageIndex}_table${tableIndex}_header_${header}`;
    const selectedType = selectedTypes[key];

    //Highlight
    highlightTableBorder(pageIndex, tableIndex);

    rows.forEach((row) => {
      const cell = row.find((c) => c.Header.replace(/\s+/g, " ").trim() === header);
      if (!cell) return;

      const allAnnots = annotationManager.getAnnotationsList();
      const headerFieldNames = [
        `field_${cell.Id}`,
        `field_${cell.Id}_Yes`,
        `field_${cell.Id}_No`,
      ];
      const existingAnnots = allAnnots.filter((a) => headerFieldNames.includes(a.fieldName));
      if (existingAnnots.length > 0) annotationManager.deleteAnnotations(existingAnnots, true, true);
      const fieldName = `field_${cell.Id}`;
      let field;
      let widgetAnnot;

      switch (selectedType) {

        case "Dropdown":
          const options = dropdownOptions[key] || [
            { value: "Yes", displayValue: "Yes" },
            { value: "No", displayValue: "No" },
            { value: "N/A", displayValue: "N/A" },
          ];

          field = new Annotations.Forms.Field(fieldName, {
            type: "Ch",
            value: options[0]?.value || "",
            options,
          });

          widgetAnnot = new Annotations.ChoiceWidgetAnnotation(field);
          widgetAnnot.FillColor = new Annotations.Color(255, 200, 200);
          widgetAnnot.PageNumber = pageNumber;
          widgetAnnot.X = cell.X;
          widgetAnnot.Y = cell.Y;
          widgetAnnot.Width = cell.CellWidth;
          widgetAnnot.Height = cell.CellHeight;
          widgetAnnot.StrokeColor = new Annotations.Color(0, 0, 255);
          widgetAnnot.BorderStyle = { width: 1, style: "solid" };
          annotationManager.getFieldManager().addField(field);
          annotationManager.addAnnotation(widgetAnnot);
          annotationManager.drawAnnotationsFromList([widgetAnnot]);
          try { annotationManager.bringToFront(widgetAnnot); } catch (e) { console.warn(e); }

          break;
        case "Checkbox": {
          const halfWidth = cell.CellWidth / 2;
          const size = Math.min(18, cell.CellHeight * 0.6, halfWidth * 0.6);
          const y = cell.Y + (cell.CellHeight - size) / 2;

          // Yes checkbox
          const fieldYes = new Annotations.Forms.Field(`${fieldName}_Yes`, { type: "Btn" });
          const checkboxYes = new Annotations.CheckButtonWidgetAnnotation(fieldYes, { optionName: "Yes" });
          checkboxYes.PageNumber = pageNumber;
          checkboxYes.X = cell.X + halfWidth / 2 - size / 2;
          checkboxYes.Y = y;
          checkboxYes.Width = size;
          checkboxYes.Height = size;
          checkboxYes.StrokeColor = new Annotations.Color(0, 0, 0);
          checkboxYes.BorderStyle = { width: 1, style: "solid" };

          // No checkbox
          const fieldNo = new Annotations.Forms.Field(`${fieldName}_No`, { type: "Btn" });
          const checkboxNo = new Annotations.CheckButtonWidgetAnnotation(fieldNo, { optionName: "No" });
          checkboxNo.PageNumber = pageNumber;
          checkboxNo.X = cell.X + halfWidth + halfWidth / 2 - size / 2;
          checkboxNo.Y = y;
          checkboxNo.Width = size;
          checkboxNo.Height = size;
          checkboxNo.StrokeColor = new Annotations.Color(0, 0, 0);
          checkboxNo.BorderStyle = { width: 1, style: "solid" };

          annotationManager.getFieldManager().addField(fieldYes);
          annotationManager.getFieldManager().addField(fieldNo);
          annotationManager.addAnnotation(checkboxYes);
          annotationManager.addAnnotation(checkboxNo);
          annotationManager.drawAnnotationsFromList([checkboxYes, checkboxNo]);

          try {
            annotationManager.bringToFront(checkboxYes);
            annotationManager.bringToFront(checkboxNo);
          } catch (e) { console.warn(e); }
          break;
        }

        case "Radio": {
          const halfWidth = cell.CellWidth / 2;
          const size = Math.min(18, cell.CellHeight * 0.6, halfWidth * 0.6);
          const y = cell.Y + (cell.CellHeight - size) / 2;
          field = new Annotations.Forms.Field(fieldName, { type: "Btn" });

          const radioYes = new Annotations.RadioButtonWidgetAnnotation(field, { optionName: "Yes" });
          radioYes.PageNumber = pageNumber;
          radioYes.X = cell.X + halfWidth / 2 - size / 2;
          radioYes.Y = y;
          radioYes.Width = size;
          radioYes.Height = size;
          radioYes.StrokeColor = new Annotations.Color(0, 0, 0);
          radioYes.BorderStyle = { width: 1, style: "solid" };

          const radioNo = new Annotations.RadioButtonWidgetAnnotation(field, { optionName: "No" });
          radioNo.PageNumber = pageNumber;
          radioNo.X = cell.X + halfWidth + halfWidth / 2 - size / 2;
          radioNo.Y = y;
          radioNo.Width = size;
          radioNo.Height = size;
          radioNo.StrokeColor = new Annotations.Color(0, 0, 0);
          radioNo.BorderStyle = { width: 1, style: "solid" };

          annotationManager.getFieldManager().addField(field);
          annotationManager.addAnnotation(radioYes);
          annotationManager.addAnnotation(radioNo);
          annotationManager.drawAnnotationsFromList([radioYes, radioNo]);
          break;
        }

        case "Textbox":
          field = new Annotations.Forms.Field(fieldName, { type: "Tx", value: "" });
          widgetAnnot = new Annotations.TextWidgetAnnotation(field);
          widgetAnnot.PageNumber = pageNumber;
          widgetAnnot.X = cell.X;
          widgetAnnot.Y = cell.Y;
          widgetAnnot.Width = cell.CellWidth;
          widgetAnnot.Height = cell.CellHeight;
          widgetAnnot.StrokeColor = new Annotations.Color(0, 0, 255);
          widgetAnnot.BorderStyle = { width: 1, style: "solid" };
          annotationManager.getFieldManager().addField(field);
          annotationManager.addAnnotation(widgetAnnot);
          annotationManager.drawAnnotationsFromList([widgetAnnot]);
          break;
      }
    });
  };

  const scrollToTable = (pageIndex, tableIndex) => {
    const documentViewer = core.getDocumentViewer();
    if (!documentViewer) return;
    const pageNumber = tableData[pageIndex].PageNumber;
    if (pageNumber > 0 && pageNumber <= documentViewer.getPageCount()) {
      core.setCurrentPage(pageNumber);
    }
    setActiveTable({ pageIndex, tableIndex });
    highlightTableBorder(pageIndex, tableIndex);
  };

  const handleEditForm = (pageIndex, tableIndex, header) => {
    // console.log("Edit form for", { pageIndex, tableIndex, header });
  };

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: isPanelOpen ? "350px" : "0px",
          transition: "width 0.3s",
          overflow: "hidden",
          borderRight: isPanelOpen ? "1px solid #ddd" : "none",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isPanelOpen && (
          <>
            <div
              style={{
                flex: "0 0 auto",
                padding: "10px",
                borderBottom: "1px solid #ddd",
                textAlign: "center",
                fontSize: "18px",
                fontWeight: 600,
                background: "#fafafa",
              }}
            >
              Table Headers
            </div>

            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                padding: "10px",
              }}
            >
              {currentTables
                .slice(pageOffset, pageOffset + PAGE_LIMIT)
                .map((t) => {
                  const headersWithEmptyRows = t.headers.filter((header) => {
                    const table = tableData[t.pageIndex].Tables[t.tableIndex];
                    const hasValue = table.Rows.some((row) => {
                      const cell = row.find(
                        (c) => c.Header.replace(/\s+/g, " ").trim() === header
                      );
                      if (!cell) return false;
                      const text = cell.Fragments.map((f) => f.Text.trim()).join("");
                      return text.length > 0;
                    });
                    return !hasValue;
                  });

                  if (headersWithEmptyRows.length === 0) return null;

                  return (
                    <div
                      key={`page${t.pageIndex}_table${t.tableIndex}`}
                      style={{
                        border: "2px solid",
                        borderColor:
                          activeTable?.pageIndex === t.pageIndex &&
                            activeTable?.tableIndex === t.tableIndex
                            ? "#1976d2"
                            : "transparent",
                        borderRadius: "6px",
                        marginBottom: "10px",
                        padding: "4px",
                        background:
                          activeTable?.pageIndex === t.pageIndex &&
                            activeTable?.tableIndex === t.tableIndex
                            ? "#e3f2fd"
                            : "transparent",
                      }}
                    >
                      <h4
                        style={{
                          cursor: "pointer",
                          color: "#1976d2",
                          textDecoration: "underline",
                        }}
                        onClick={() => scrollToTable(t.pageNumber - 1, t.tableIndex)}
                      >
                        Page {t.pageNumber} - Table {t.tableIndex + 1}
                      </h4>

                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                          marginBottom: "10px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f1f1f1", textAlign: "left" }}>
                            <th style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>Header</th>
                            <th style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>Form Type</th>
                            <th style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {headersWithEmptyRows.map((header) => {
                            const key = `page${t.pageIndex}_table${t.tableIndex}_header_${header}`;
                            return (
                              <tr key={key}>
                                <td style={{ padding: "8px 6px", fontWeight: 500 }}>{header}</td>
                                <td style={{ padding: "8px 6px" }}>
                                  <select
                                    value={selectedTypes[key]}
                                    onChange={(e) => handleTypeChange(key, e.target.value)}
                                    style={{
                                      width: "100%",
                                      padding: "5px 6px",
                                      fontSize: "13px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                    }}
                                  >
                                    {FORM_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: "8px 6px", textAlign: "center" }}>
                                  <button
                                    onClick={() => {
                                      const type = selectedTypes[key];
                                      if (!addedHeaders[key]) {
                                        scrollToTable(t.pageIndex, t.tableIndex);
                                        setAddedHeaders((prev) => ({ ...prev, [key]: true }));
                                        setActiveHeader(header);
                                        if (type === "Dropdown") setOpenModal(true);
                                        else addFormToHeader(t.pageIndex, t.tableIndex, header);
                                      } else {
                                        handleEditForm(t.pageIndex, t.tableIndex, header);
                                        setActiveHeader(header);
                                        if (type === "Dropdown") setOpenModal(true);
                                      }
                                    }}
                                    style={{
                                      padding: "5px 10px",
                                      background: addedHeaders[key] ? "#ffa726" : "#1976d2",
                                      color: "#fff",
                                      borderRadius: "4px",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {addedHeaders[key] && selectedTypes[key] === "Dropdown"
                                      ? "Edit"
                                      : "Add"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
            </div>

            <SmartPagination
              totalPages={totalBatches}
              currentPage={currentPageBatch + 1}
              onPageChange={(page) => {
                setCurrentPageBatch(page - 1);
                const startPage = pagesWithTables[(page - 1) * PAGE_LIMIT]?.pageNumber ?? 1;
                core.setCurrentPage(startPage);
                instanceRef.current?.Core.documentViewer.setCurrentPage(startPage);
              }}
            />

          </>
        )}
      </div>

      <FieldModal
        open={openModal}
        header={`page${activeTable?.pageIndex}_table${activeTable?.tableIndex}_header_${activeHeader}`}
        customOptions={dropdownOptions[`page${activeTable?.pageIndex}_table${activeTable?.tableIndex}_header_${activeHeader}`]?.map(o => o.value) || []}
        onSave={handleFieldSave}
        onClose={() => setOpenModal(false)}
      />

    </div>
  );
};

export default WebViewerComponent;



