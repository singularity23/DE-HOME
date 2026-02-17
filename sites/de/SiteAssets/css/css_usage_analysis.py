#!/usr/bin/env python3
"""
CSS Usage Analysis Tool
Analyzes HTML files to identify unused CSS selectors from default.css and default2.css
"""

import os
import re
import glob
from pathlib import Path
from bs4 import BeautifulSoup


def extract_css_selectors(css_content):
    """Extract all CSS selectors from CSS content"""
    # Remove comments
    css_content = re.sub(r"/\*.*?\*/", "", css_content, flags=re.DOTALL)

    # Find CSS rules
    selectors = set()
    pattern = r"([^{}]+)\s*\{([^{}]*)\}"
    matches = re.findall(pattern, css_content)

    for selector, declarations in matches:
        selector = selector.strip()
        if selector and declarations.strip():
            # Split multiple selectors (comma-separated)
            for sel in selector.split(","):
                sel = sel.strip()
                if sel:
                    selectors.add(sel)

    return selectors


def extract_html_elements(html_content):
    """Extract all HTML elements, classes, and IDs from HTML content"""
    elements = set()

    try:
        soup = BeautifulSoup(html_content, "html.parser")

        # Extract all tags
        for tag in soup.find_all():
            elements.add(tag.name)

            # Extract classes
            if tag.get("class"):
                for cls in tag.get("class"):
                    elements.add(f".{cls}")
                    elements.add(cls)  # Also add without dot for analysis

            # Extract IDs
            if tag.get("id"):
                elements.add(f'#{tag.get("id")}')
                elements.add(tag.get("id"))  # Also add without # for analysis

    except Exception as e:
        print(f"Error parsing HTML: {e}")

    return elements


def analyze_css_usage():
    """Main analysis function"""

    # Read CSS files
    css_files = {
        "default.css": "sites\de\SiteAssets\css\default.css",
        "default2.css": "sites\de\SiteAssets\css\default2.css",
    }

    css_selectors = {}
    for name, path in css_files.items():
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                css_selectors[name] = extract_css_selectors(content)
                print(f"Extracted {len(css_selectors[name])} selectors from {name}")
        except Exception as e:
            print(f"Error reading {path}: {e}")
            css_selectors[name] = set()

    # Find all HTML files
    html_files = []

    # Main sites directory
    main_html = [
        "../../../de/body_alternative.html",
        "../../../de/body.html",
        "../../../de/footer.html",
        "../../../de/head.html",
        "../../../de/popup.html",
    ]
    html_files.extend([f for f in main_html if os.path.exists(f)])

    # SiteAssets/html directory
    html_dir = "sites\de\SiteAssets\html"
    if os.path.exists(html_dir):
        html_files.extend(glob.glob(os.path.join(html_dir, "*.html")))

    print(f"Found {len(html_files)} HTML files to analyze")

    # Extract elements from all HTML files
    all_html_elements = set()
    for html_file in html_files:
        try:
            with open(html_file, "r", encoding="utf-8") as f:
                content = f.read()
                elements = extract_html_elements(content)
                all_html_elements.update(elements)
                print(f"Extracted {len(elements)} elements from {html_file}")
        except Exception as e:
            print(f"Error reading {html_file}: {e}")

    print(f"Total unique elements found in HTML: {len(all_html_elements)}")

    # Analyze usage for each CSS file
    results = {}

    for css_name, selectors in css_selectors.items():
        if not selectors:
            continue

        used_selectors = set()
        unused_selectors = set()

        for selector in selectors:
            # Check if selector is used in HTML
            if is_selector_used(selector, all_html_elements):
                used_selectors.add(selector)
            else:
                unused_selectors.add(selector)

        results[css_name] = {
            "total_selectors": len(selectors),
            "used_selectors": len(used_selectors),
            "unused_selectors": len(unused_selectors),
            "used_list": list(used_selectors),
            "unused_list": list(unused_selectors),
        }

    return results, all_html_elements


def is_selector_used(selector, html_elements):
    """Check if a CSS selector is used in HTML elements"""

    # Remove pseudo-classes and pseudo-elements for basic matching
    base_selector = re.sub(r":[a-zA-Z-]+", "", selector)
    base_selector = re.sub(r"::[a-zA-Z-]+", "", base_selector)

    # Remove attribute selectors
    base_selector = re.sub(r"\[.*?\]", "", base_selector)

    # Remove combinators for basic matching
    base_selector = re.sub(r"\s+>", " ", base_selector)
    base_selector = re.sub(r"\s+\+", " ", base_selector)
    base_selector = re.sub(r"\s+~", " ", base_selector)

    # Clean up extra spaces
    base_selector = re.sub(r"\s+", " ", base_selector).strip()

    # Check various forms of the selector
    check_patterns = [
        base_selector,
        base_selector.split(" ")[0],  # Just the first part
        base_selector.split(" ")[-1],  # Just the last part
    ]

    # Add common variations
    if "." in base_selector:
        class_name = base_selector.split(".")[-1]
        check_patterns.extend([f".{class_name}", class_name])

    if "#" in base_selector:
        id_name = base_selector.split("#")[-1]
        check_patterns.extend([f"#{id_name}", id_name])

    # Check if any pattern matches HTML elements
    for pattern in check_patterns:
        if pattern in html_elements:
            return True

    return False


def generate_report(results, html_elements):
    """Generate a comprehensive usage report"""

    report = []
    report.append("# CSS Usage Analysis Report")
    report.append("=" * 50)
    report.append("")

    # Summary
    report.append("## Summary")
    report.append("")

    for css_name, data in results.items():
        usage_percent = (
            (data["used_selectors"] / data["total_selectors"] * 100)
            if data["total_selectors"] > 0
            else 0
        )
        report.append(f"### {css_name}")
        report.append(f"- Total selectors: {data['total_selectors']}")
        report.append(
            f"- Used selectors: {data['used_selectors']} ({usage_percent:.1f}%)"
        )
        report.append(f"- Unused selectors: {data['unused_selectors']}")
        report.append("")

    # Detailed unused selectors
    report.append("## Unused Selectors")
    report.append("")

    for css_name, data in results.items():
        if data["unused_selectors"] > 0:
            report.append(
                f"### {css_name} - {data['unused_selectors']} unused selectors"
            )
            report.append("")

            # Group by type
            unused_by_type = group_selectors_by_type(data["unused_list"])

            for selector_type, selectors in unused_by_type.items():
                if selectors:
                    report.append(f"#### {selector_type}")
                    for selector in sorted(selectors)[:20]:  # Show first 20
                        report.append(f"- `{selector}`")
                    if len(selectors) > 20:
                        report.append(f"... and {len(selectors) - 20} more")
                    report.append("")

    # HTML elements found
    report.append("## HTML Elements Found")
    report.append("")
    report.append(f"Total unique elements: {len(html_elements)}")
    report.append("")

    # Group HTML elements by type
    html_by_type = group_html_elements_by_type(html_elements)

    for element_type, elements in html_by_type.items():
        if elements:
            report.append(f"### {element_type}")
            for element in sorted(elements)[:15]:  # Show first 15
                report.append(f"- `{element}`")
            if len(elements) > 15:
                report.append(f"... and {len(elements) - 15} more")
            report.append("")

    # Recommendations
    report.append("## Recommendations")
    report.append("")
    report.append("### For CSS Optimization")

    for css_name, data in results.items():
        if data["unused_selectors"] > 0:
            usage_percent = (
                (data["used_selectors"] / data["total_selectors"] * 100)
                if data["total_selectors"] > 0
                else 0
            )
            if usage_percent < 50:
                report.append(
                    f"- **{css_name}**: Only {usage_percent:.1f}% of selectors are used. Consider removing unused selectors."
                )
            elif usage_percent < 80:
                report.append(
                    f"- **{css_name}**: {usage_percent:.1f}% usage is acceptable but could be optimized."
                )
            else:
                report.append(f"- **{css_name}**: {usage_percent:.1f}% usage is good.")

    report.append("")
    report.append("### Unused Selector Categories")
    for css_name, data in results.items():
        if data["unused_selectors"] > 0:
            unused_types = identify_unused_selector_types(data["unused_list"])
            report.append(f"#### {css_name}")
            for category, count in unused_types.items():
                report.append(f"- {category}: {count} selectors")
            report.append("")

    return "\n".join(report)


def group_selectors_by_type(selectors):
    """Group CSS selectors by type"""
    groups = {
        "Classes": [],
        "IDs": [],
        "Tags": [],
        "Pseudo-classes": [],
        "Pseudo-elements": [],
        "Attributes": [],
        "Combinators": [],
        "Media queries": [],
        "Keyframes": [],
        "Other": [],
    }

    for selector in selectors:
        if selector.startswith("."):
            groups["Classes"].append(selector)
        elif selector.startswith("#"):
            groups["IDs"].append(selector)
        elif selector.startswith("@media"):
            groups["Media queries"].append(selector)
        elif selector.startswith("@keyframes"):
            groups["Keyframes"].append(selector)
        elif ":" in selector:
            if "::" in selector:
                groups["Pseudo-elements"].append(selector)
            else:
                groups["Pseudo-classes"].append(selector)
        elif "[" in selector:
            groups["Attributes"].append(selector)
        elif " " in selector or ">" in selector or "+" in selector or "~" in selector:
            groups["Combinators"].append(selector)
        elif re.match(r"^[a-zA-Z][a-zA-Z0-9-]*$", selector):
            groups["Tags"].append(selector)
        else:
            groups["Other"].append(selector)

    return groups


def group_html_elements_by_type(elements):
    """Group HTML elements by type"""
    groups = {"Tags": [], "Classes": [], "IDs": [], "Other": []}

    for element in elements:
        if element.startswith("."):
            groups["Classes"].append(element)
        elif element.startswith("#"):
            groups["IDs"].append(element)
        elif re.match(r"^[a-zA-Z][a-zA-Z0-9-]*$", element):
            groups["Tags"].append(element)
        else:
            groups["Other"].append(element)

    return groups


def identify_unused_selector_types(unused_selectors):
    """Identify categories of unused selectors"""
    categories = {
        "Utility classes": 0,
        "Layout classes": 0,
        "Typography classes": 0,
        "Color classes": 0,
        "Spacing classes": 0,
        "Component classes": 0,
        "State classes": 0,
        "Pseudo-selectors": 0,
        "Media queries": 0,
        "Keyframes": 0,
        "Other": 0,
    }

    for selector in unused_selectors:
        selector_lower = selector.lower()

        # Utility patterns
        if any(
            word in selector_lower
            for word in ["hidden", "show", "visible", "invisible"]
        ):
            categories["Utility classes"] += 1
        elif any(word in selector_lower for word in ["container", "wrapper", "box"]):
            categories["Layout classes"] += 1
        elif any(
            word in selector_lower for word in ["text-", "font-", "heading", "title"]
        ):
            categories["Typography classes"] += 1
        elif any(word in selector_lower for word in ["bg-", "color-", "bg-", "text-"]):
            categories["Color classes"] += 1
        elif any(word in selector_lower for word in ["margin", "padding", "m-", "p-"]):
            categories["Spacing classes"] += 1
        elif any(word in selector_lower for word in ["btn", "link", "nav", "menu"]):
            categories["Component classes"] += 1
        elif any(
            word in selector_lower
            for word in [":hover", ":focus", ":active", ":visited"]
        ):
            categories["State classes"] += 1
        elif ":" in selector and not selector.startswith(":"):
            categories["Pseudo-selectors"] += 1
        elif selector.startswith("@media"):
            categories["Media queries"] += 1
        elif selector.startswith("@keyframes"):
            categories["Keyframes"] += 1
        else:
            categories["Other"] += 1

    return categories


if __name__ == "__main__":
    print("Starting CSS Usage Analysis...")
    print("=" * 50)

    try:
        results, html_elements = analyze_css_usage()
        report = generate_report(results, html_elements)

        # Save report
        with open(
            "sites\\de\\SiteAssets\\css\\css_usage_report.md", "w", encoding="utf-8"
        ) as f:
            f.write(report)

        print("\nAnalysis complete! Report saved to css_usage_report.md")

        # Print summary
        print("\n" + "=" * 50)
        print("SUMMARY")
        print("=" * 50)

        for css_name, data in results.items():
            usage_percent = (
                (data["used_selectors"] / data["total_selectors"] * 100)
                if data["total_selectors"] > 0
                else 0
            )
            print(f"\n{css_name}:")
            print(f"  Total: {data['total_selectors']} selectors")
            print(f"  Used: {data['used_selectors']} ({usage_percent:.1f}%)")
            print(f"  Unused: {data['unused_selectors']}")

    except Exception as e:
        print(f"Error during analysis: {e}")
        import traceback

        traceback.print_exc()
