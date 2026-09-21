import sys
import zipfile
import xml.etree.ElementTree as ET

source, target = sys.argv[1:3]
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
ET.register_namespace("", REL_NS)
ET.register_namespace("", CT_NS)

def strip_xml(name, data):
    if name.endswith(".rels"):
        root = ET.fromstring(data)
        for rel in list(root):
            target_value = rel.attrib.get("Target", "").lower()
            if "notes" in target_value or "comment" in target_value:
                root.remove(rel)
        return ET.tostring(root, encoding="utf-8", xml_declaration=True)
    if name == "[Content_Types].xml":
        root = ET.fromstring(data)
        for item in list(root):
            part_name = item.attrib.get("PartName", "").lower()
            content_type = item.attrib.get("ContentType", "").lower()
            if "notes" in part_name or "comment" in part_name or "comments" in content_type:
                root.remove(item)
        return ET.tostring(root, encoding="utf-8", xml_declaration=True)
    if name == "ppt/presentation.xml":
        root = ET.fromstring(data)
        ns = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main"}
        for node in root.findall("p:notesMasterIdLst", ns):
            root.remove(node)
        return ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return data

with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zout:
    for info in zin.infolist():
        name = info.filename
        lower = name.lower()
        if lower.startswith("ppt/notesslides/") or lower.startswith("ppt/notesmasters/"):
            continue
        data = strip_xml(name, zin.read(name))
        zout.writestr(info, data)

print(target)
