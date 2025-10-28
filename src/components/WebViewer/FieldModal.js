import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

// interface CustomOption {
//     value: string;
//     isEditing?: boolean;
// }

// interface FieldModalProps {
//     open: boolean;
//     onClose: () => void;
//     header: string;
//     customOptions?: string[];
//     onSave: (headerKey: string, options: string[]) => void;
// }

const FieldModal = ({
    open,
    onClose,
    header,
    customOptions = [],
    onSave,
}) => {
    const [activeTab, setActiveTab] = useState("general");
    const [optionType, setOptionType] = useState("standard");
    const [localCustomOptions, setLocalCustomOptions] = useState([]);

    useEffect(() => {
        if (open) {
            if (customOptions.length > 0) {
                setOptionType("custom");
                setLocalCustomOptions(customOptions.map(v => ({ value: v })));

            } else {
                setOptionType("standard");
                setLocalCustomOptions([]);
            }
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            if (optionType === "custom") {
                if (customOptions.length > 0) {
                    setLocalCustomOptions(customOptions.map(v => ({ value: v })));
                } else {
                    setLocalCustomOptions([{ value: "", isEditing: true }]);
                }
            } else {
                setLocalCustomOptions([]);
            }
        }
    }, [optionType]);

    const handleSave = () => {
        if (optionType === "custom") {
            const values = localCustomOptions
                .map((o) => o.value.trim())
                .filter(Boolean);
            onSave(header, values);
        } else {
            onSave(header, ["Yes", "No", "N/A"]);
        }
        onClose();
    };

    const addCustomOption = () => {
        setLocalCustomOptions([...localCustomOptions, { value: "", isEditing: true }]);
    };

    const updateOption = (index, value) => {
        const updated = [...localCustomOptions];
        updated[index].value = value;
        setLocalCustomOptions(updated);
    };

    const toggleEdit = (index) => {
        const updated = [...localCustomOptions];
        updated[index].isEditing = !updated[index].isEditing;
        setLocalCustomOptions(updated);
    };

    const deleteOption = (index) => {
        setLocalCustomOptions(localCustomOptions.filter((_, i) => i !== index));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const newOptions = Array.from(localCustomOptions);
        const [moved] = newOptions.splice(result.source.index, 1);
        newOptions.splice(result.destination.index, 0, moved);
        setLocalCustomOptions(newOptions);
    };

    if (!open) return null;

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div style={{ background: "#fff", width: "500px", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>
                    <h3>Dropdown Properties</h3>
                </div>

                <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
                    <button onClick={() => setActiveTab("general")} style={{ flex: 1, padding: "10px", border: "none", background: activeTab === "general" ? "#eee" : "transparent" }}>General</button>
                    <button onClick={() => setActiveTab("options")} style={{ flex: 1, padding: "10px", border: "none", background: activeTab === "options" ? "#eee" : "transparent" }}>Options</button>
                </div>

                <div style={{ padding: "16px" }}>
                    {activeTab === "general" && (
                        <div>
                            <label style={{ display: "block", marginBottom: "6px" }}>Field Name</label>
                            <input type="text" value={header} readOnly style={{ width: "100%", padding: "8px" }} />
                        </div>
                    )}

                    {activeTab === "options" && (
                        <div>
                            <div style={{ marginBottom: "16px" }}>
                                <label>
                                    <input type="radio" name="optionType" value="standard" checked={optionType === "standard"} onChange={() => setOptionType("standard")} />
                                    Standard Result
                                </label>
                                <label style={{ marginLeft: "20px" }}>
                                    <input type="radio" name="optionType" value="custom" checked={optionType === "custom"} onChange={() => setOptionType("custom")} />
                                    Custom Options
                                </label>
                            </div>

                            {optionType === "custom" ? (
                                localCustomOptions.length > 1 ? (
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        <Droppable droppableId="custom-options">
                                            {(provided) => (
                                                <table ref={provided.innerRef} {...provided.droppableProps} style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Option</th>
                                                            <th style={{ border: "1px solid #ddd", padding: "8px", width: "60px" }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {localCustomOptions.map((opt, index) => (
                                                            <Draggable key={index} draggableId={`option-${index}`} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <tr
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            background: snapshot.isDragging ? "#e0f7fa" : "transparent",
                                                                        }}
                                                                    >
                                                                        <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                                                            <span {...provided.dragHandleProps} style={{ cursor: "grab", marginRight: "6px" }}>☰</span>
                                                                            {opt.isEditing
                                                                                ? <input type="text" value={opt.value} onChange={e => updateOption(index, e.target.value)} style={{ width: "80%", padding: "4px", borderRadius: "4px", border: "1px solid #ccc" }} />
                                                                                : opt.value
                                                                            }
                                                                        </td>
                                                                        <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                                            {opt.isEditing
                                                                                ? <button onClick={() => toggleEdit(index)}>✅</button>
                                                                                : <>
                                                                                    <span onClick={() => toggleEdit(index)} style={{ cursor: "pointer", marginRight: "8px" }}>✏️</span>
                                                                                    <span onClick={() => deleteOption(index)} style={{ cursor: "pointer" }}>🗑️</span>
                                                                                </>
                                                                            }
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </tbody>
                                                </table>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                ) : (
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                                        <thead>
                                            <tr>
                                                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Option</th>
                                                <th style={{ border: "1px solid #ddd", padding: "8px", width: "60px" }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {localCustomOptions.map((opt, index) => (
                                                <tr key={index}>
                                                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                                                        {opt.isEditing
                                                            ? <input type="text" value={opt.value} onChange={e => updateOption(index, e.target.value)} style={{ width: "98%", padding: "4px", borderRadius: "4px", border: "1px solid #ccc" }} />
                                                            : opt.value
                                                        }
                                                    </td>
                                                    <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>
                                                        {opt.isEditing
                                                            ? <button onClick={() => toggleEdit(index)}>✅</button>
                                                            : <>
                                                                <span onClick={() => toggleEdit(index)} style={{ cursor: "pointer", marginRight: "8px" }}>✏️</span>
                                                                <span onClick={() => deleteOption(index)} style={{ cursor: "pointer" }}>🗑️</span>
                                                            </>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                                    <tbody>
                                        {["Yes", "No", "N/A"].map(v => <tr key={v}><td style={{ border: "1px solid #ddd", padding: "8px" }}>{v}</td></tr>)}
                                    </tbody>
                                </table>
                            )}

                            {optionType === "custom" && (
                                <button onClick={addCustomOption} style={{ marginTop: "10px", padding: "6px 12px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>➕ Add Option</button>
                            )}

                        </div>
                    )}
                </div>

                <div style={{ borderTop: "1px solid #ddd", display: "flex", justifyContent: "flex-end", padding: "12px" }}>
                    <button onClick={onClose} style={{ marginRight: "8px" }}>Cancel</button>
                    <button onClick={handleSave} style={{ background: "#1976d2", color: "#fff", padding: "6px 12px", border: "none", borderRadius: "4px" }}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default FieldModal;
