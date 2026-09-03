"""
Authoritative Project & Feature Knowledge Base for EcoTrace.
Provides Level 1 (Conceptual & Feature Knowledge) definitions, methodologies,
and UI explanations without requiring database observations.
"""

from typing import Any


PROJECT_DEFINITIONS: dict[str, dict[str, str]] = {
    "visitor_flow": {
        "title": "Visitor Flow",
        "definition": (
            "Visitor Flow describes how tourists move through and concentrate within a destination. "
            "In EcoTrace, it helps us understand tourism activity and identify areas where visitor "
            "pressure may become important for planning and environmental management."
        ),
        "work": (
            "Visitor Flow helps show where and how tourism activity is distributed across a destination. "
            "This can help identify high-pressure areas and support better tourism management."
        ),
        "importance": (
            "Because the number and concentration of visitors can affect infrastructure, local communities, "
            "and sensitive environmental areas. Tracking visitor flow helps identify where tourism pressure is highest."
        ),
        "help": (
            "Visitor Flow helps destination managers balance tourist distribution, prevent ecological "
            "strain on sensitive corridors, and plan infrastructure capacity before overcrowding occurs."
        ),
        "government_help": (
            "Yes. It can help destination managers and government authorities identify areas with higher visitor pressure "
            "and make better tourism-management, zoning, and infrastructure decisions."
        ),
    },
    "impact_dashboard": {
        "title": "Impact Dashboard",
        "definition": (
            "The Impact Dashboard (or Destination Report Card) provides an integrated, evidence-based overview of how "
            "tourism affects a destination across environmental, community, economic, and tourism indicators."
        ),
        "work": (
            "It aggregates verified observations into standardized category scores and highlights key pressure areas, "
            "data gaps, and overall destination health."
        ),
        "importance": (
            "It gives stakeholders a transparent, holistic view of tourism impacts rather than relying only on vanity footfall metrics."
        ),
        "help": (
            "It enables evidence-based destination stewardship, helping communities and authorities identify which areas need protective action."
        ),
    },
    "compare_matrix": {
        "title": "Compare Matrix",
        "definition": (
            "Compare Matrix lets you compare two destinations across key tourism-impact areas such as environment, "
            "biodiversity, tourism, economy, and community. It helps you understand where the available evidence shows differences "
            "between destinations based on standardized indicators."
        ),
        "work": (
            "It places indicators from two destinations side-by-side to highlight differences in carrying capacity, "
            "ecological stress, and local economic retention."
        ),
        "importance": (
            "No two destinations face identical pressures. Comparing profiles helps identify transferable solutions and corridor-wide management strategies."
        ),
        "help": (
            "It helps planners and researchers understand relative strengths, vulnerabilities, and data gaps across regional tourism corridors."
        ),
    },
    "economy_and_purchases": {
        "title": "Economy & Purchases",
        "definition": (
            "Economy & Purchases focuses on the economic side of tourism — especially whether tourism-related activity connects "
            "with local businesses, worker income, and community benefits. The goal is to look beyond visitor footfall and understand "
            "whether tourism revenue is genuinely retained in the local economy."
        ),
        "work": (
            "It tracks local procurement, artisan sales, boatmen wages, and revenue retention to measure how much visitor spending stays in resident hands."
        ),
        "importance": (
            "It helps us look beyond visitor numbers and ask whether tourism activity is actually connected to local businesses, workers, and communities. "
            "High tourist footfall alone does not prove that the economic benefits are reaching local people."
        ),
        "help": (
            "It guides interventions that reduce external revenue leakage and support community-owned enterprises."
        ),
    },
    "impact_ledger": {
        "title": "Impact Ledger",
        "definition": (
            "Impact Ledger is the central registry where every indicator observation, measurement timestamp, "
            "and official source citation is recorded and verified."
        ),
        "work": (
            "It maintains an immutable, traceable record of observations and links each number directly to its statutory or field source."
        ),
        "importance": (
            "Transparency is essential for trust. The ledger guarantees that no score is fabricated or altered without documented evidence."
        ),
        "help": (
            "It gives auditors, researchers, and citizens full confidence in the provenance and integrity of reported impact data."
        ),
    },
    "deep_audits": {
        "title": "Deep Audits",
        "definition": (
            "Deep Audits (Authority Dashboard) provides specialized diagnostic tools for regulators and destination managers to audit "
            "data sources, resolve conflicting observations, and run situational policy simulations."
        ),
        "work": (
            "It exposes raw telemetry streams, source conflict reconciliation audits, and counterfactual simulation models."
        ),
        "importance": (
            "It ensures administrative oversight and enables testing the impact of policy interventions before deploying them in the field."
        ),
        "help": (
            "Authorities can test scenarios (like boat electrification or visitor caps) and verify evidence before enacting regulations."
        ),
    },
    "recommendations": {
        "title": "Recommendations",
        "definition": (
            "Recommendations provide concrete, evidence-backed actions tailored for either low-impact tourist choices or "
            "authoritative government policy interventions."
        ),
        "work": (
            "It translates data findings and vulnerability indicators into actionable steps to reduce tourism pressure and enhance local benefits."
        ),
        "importance": (
            "Data without action does not protect a destination. Recommendations bridge the gap between measurement and regenerative impact."
        ),
        "help": (
            "Tourists learn how to travel responsibly, and authorities receive prioritized policy interventions tied to measured indicators."
        ),
    },
    "tourism_impact": {
        "title": "Tourism Impact",
        "definition": (
            "Tourism impact refers to the effects tourism has on a destination's environment, economy, and communities. "
            "EcoTrace looks at these effects using evidence across multiple impact areas."
        ),
        "work": (
            "It evaluates the consequences of visitor activities on natural resources, cultural heritage, infrastructure, and resident well-being."
        ),
        "importance": (
            "Understanding impact ensures that tourism develops sustainably without depleting the natural and cultural assets that attract visitors."
        ),
        "help": (
            "It helps destinations shift from volume-driven overtourism to regenerative tourism that enriches host communities."
        ),
    },
    "biodiversity": {
        "title": "Biodiversity",
        "definition": (
            "Biodiversity represents the variety and health of living species and ecosystems in a destination, such as wetland avifauna, "
            "marine life, and critical wildlife habitats."
        ),
        "work": (
            "It monitors indicator species (such as Irrawaddy dolphins and migratory waterfowl) and detects habitat disturbance from motorized tourism and human encroachment."
        ),
        "importance": (
            "Ecological balance depends on biodiversity. Degraded habitats reduce natural resilience and diminish the destination's intrinsic value."
        ),
        "help": (
            "Tracking biodiversity indicators helps establish acoustic buffer zones, seasonal sanctuary closures, and species protection bylaws."
        ),
    },
    "environmental_impact": {
        "title": "Environmental Impact",
        "definition": (
            "Environmental Impact encompasses the physical and ecological changes caused by tourism, including water quality, "
            "waste generation, ambient noise levels, and carbon emissions."
        ),
        "work": (
            "It measures environmental indicators against statutory ecological thresholds to identify when carrying capacities are exceeded."
        ),
        "importance": (
            "Unchecked tourism degrades natural ecosystems, pollutes water bodies, and generates unmanaged solid waste."
        ),
        "help": (
            "It enables early warning detection so managers can implement mitigation measures before irreversible ecological damage occurs."
        ),
    },
    "water": {
        "title": "Water Quality & Health",
        "definition": (
            "Water indicators track the ecological and chemical health of lagoons, lakes, and coastal waters, focusing on dissolved oxygen, "
            "salinity, turbidity, and contamination."
        ),
        "work": (
            "It monitors aquatic conditions vital for fisheries, avifauna feeding, and local drinking water resources."
        ),
        "importance": (
            "Water is the lifeblood of wetland ecosystems. Changes in dissolved oxygen or fuel contamination directly threaten aquatic life and fisher livelihoods."
        ),
        "help": (
            "Alerts authorities to agricultural runoff, motorboat oil spills, or wastewater discharge requiring immediate remediation."
        ),
    },
    "fisheries": {
        "title": "Fisheries",
        "definition": (
            "Fisheries indicators monitor traditional fishing community livelihoods, species catch stability, breeding nursery zones, and conflicts with tourist motorized boats."
        ),
        "work": (
            "It tracks fisher household income, motorized boat interactions, and nursery habitat preservation."
        ),
        "importance": (
            "Traditional fishers are often the most vulnerable to tourism disruptions such as motorized noise and net damage."
        ),
        "help": (
            "Ensures tourism coexists equitably with traditional fishing and protects critical spawning grounds from boat traffic."
        ),
    },
    "community_benefits": {
        "title": "Community Benefits",
        "definition": (
            "Community Benefits measure whether tourism provides tangible welfare, fair incomes, capacity-building, and social empowerment to resident populations."
        ),
        "work": (
            "It tracks training programs, cooperative guide licensing, local employment shares, and community-led ecotourism initiatives."
        ),
        "importance": (
            "Tourism is only sustainable when host communities are active beneficiaries and stewards, not displaced bystanders."
        ),
        "help": (
            "Helps prioritize programs like boatmen safety training and artisan cooperatives that channel tourism spend directly to local households."
        ),
    },
    "economic_retention": {
        "title": "Economic Retention",
        "definition": (
            "Economic retention refers to the proportion of tourist expenditure that remains within the local destination economy, "
            "rather than leaking out to non-local tour operators, external hotel chains, or distant intermediaries."
        ),
        "work": (
            "It measures direct payments to local guides, homestays, local transport, and native artisan cooperatives."
        ),
        "importance": (
            "High visitor numbers can be misleading if most revenue immediately leaves the region. Retention measures genuine economic benefit for residents."
        ),
        "help": (
            "Guides destination policies toward supporting local supply chains and community-owned tourism enterprises."
        ),
    },
    "evidence": {
        "title": "Evidence",
        "definition": (
            "Evidence refers to verifiable, documented observations, sensor records, official census counts, and published research "
            "that back up every indicator in EcoTrace."
        ),
        "work": (
            "It links every number to a named source organisation, collection methodology, and time period."
        ),
        "importance": (
            "Without verified evidence, sustainability assessments become speculative claims or greenwashing."
        ),
        "help": (
            "Ensures all stakeholders can audit and verify the factual foundation of destination ratings."
        ),
    },
    "verification": {
        "title": "Verification",
        "definition": (
            "Verification is the formal process of validating observations against statutory authorities, official registries, "
            "and peer-reviewed methods before accepting them into the ledger."
        ),
        "work": (
            "It checks data provenance, collection methodology, temporal coverage, and destination specificity."
        ),
        "importance": (
            "Because the report card is intended to reflect real conditions. Using verified sources makes the assessment traceable "
            "and reduces the risk of making conclusions from unreliable or assumed values."
        ),
        "help": (
            "Guarantees that destination scores reflect verified reality rather than uncorroborated assumptions."
        ),
    },
    "data_gap": {
        "title": "Data Gap",
        "definition": (
            "A data gap means the available evidence isn't sufficient to reliably calculate or assess a particular indicator. "
            "EcoTrace keeps it as a gap instead of filling it with an assumed value."
        ),
        "work": (
            "It explicitly flags unrecorded or unmonitored parameters (such as microplastics or continuous ambient noise) in reports."
        ),
        "importance": (
            "Highlighting gaps prevents false certainty, protects scientific integrity, and shows researchers and governments exactly where field monitoring is needed."
        ),
        "help": (
            "Helps funding agencies and environmental authorities direct monitoring resources to where data is currently missing."
        ),
    },
    "metric": {
        "title": "Metric",
        "definition": (
            "A metric is a standardized, measurable indicator with a defined unit, category, directionality, and threshold used to evaluate destination conditions."
        ),
        "work": (
            "It quantifies specific variables (such as dissolved oxygen in mg/L, or trained boatmen count) under a uniform methodology."
        ),
        "importance": (
            "Standardization allows fair comparisons over time and across different destinations in a tourism corridor."
        ),
        "help": (
            "Provides objective benchmarks for evaluating whether conditions are improving or deteriorating."
        ),
    },
    "score": {
        "title": "Score",
        "definition": (
            "A score is a synthesized performance index (from 0 to 100) calculated from verified metrics across environmental, social, and economic pillars."
        ),
        "work": (
            "It normalizes disparate metrics into a composite assessment of destination sustainability."
        ),
        "importance": (
            "It provides a readable overview while remaining backed by detailed underlying indicator observations."
        ),
        "help": (
            "When evidence is partial, EcoTrace transparently marks it as a 'Candidate score' to maintain scientific integrity."
        ),
    },
    "confidence": {
        "title": "Confidence Level",
        "definition": (
            "Confidence represents the statistical and methodological reliability of an indicator observation (graded as High, Medium, or Low)."
        ),
        "work": (
            "It evaluates source authority, sampling frequency, and measurement recency."
        ),
        "importance": (
            "Prevents treating preliminary estimates or proxy data with the same authority as multi-year statutory telemetry."
        ),
        "help": (
            "Directs attention to indicators that need stronger field validation."
        ),
    },
    "provenance": {
        "title": "Provenance",
        "definition": (
            "Provenance is the complete, unbroken audit trail documenting who recorded the data, when it was gathered, with what methodology, and from which official source."
        ),
        "work": (
            "It preserves citation records, statutory URLs, and verification timestamps for every observation."
        ),
        "importance": (
            "Guarantees total auditability and prevents data tampering or unattributed claims."
        ),
        "help": (
            "Allows any researcher or authority to trace a score back to its primary statutory publication."
        ),
    },
    "reportability": {
        "title": "Reportability",
        "definition": (
            "Reportability defines whether a destination's evidence coverage meets statutory thresholds required to publish an official, certified rating."
        ),
        "work": (
            "It evaluates whether all mandatory pillars have sufficient verified observations."
        ),
        "importance": (
            "Protects against publishing premature or misleading scores when substantial data gaps exist."
        ),
        "help": (
            "If evidence is incomplete, the system labels the result as 'Candidate score — not yet reportable' rather than claiming definitive certification."
        ),
    },
    "ecotrace": {
        "title": "EcoTrace Platform",
        "definition": (
            "EcoTrace is an evidence-based tourism impact platform. It helps users understand the impact of tourism on a destination "
            "by bringing together evidence on areas such as environment, biodiversity, tourism, economy, fisheries, and community benefits."
        ),
        "work": (
            "It integrates verified field data, statutory records, carrying capacity models, and policy simulation tools to support sustainable destination stewardship."
        ),
        "importance": (
            "Because sustainable tourism requires moving beyond mere visitor counting to understanding and managing real ecological and community impacts."
        ),
        "help": (
            "Empowers travelers with low-impact recommendations, provides communities with transparent records, and equips authorities with evidence-based policy tools."
        ),
    },
    "regenledger": {
        "title": "RegenLedger",
        "definition": (
            "RegenLedger is the underlying verifiable data framework of EcoTrace that maintains an auditable, timestamped ledger of all tourism impact observations."
        ),
        "work": (
            "It ensures consensus, provenance tracking, and data integrity across multi-source ecological and economic telemetry."
        ),
        "importance": (
            "It eliminates ungrounded claims and guarantees that report card scores remain fully traceable to statutory field sources."
        ),
        "help": (
            "Serves as the cryptographic trust anchor for destination reporting and public accountability."
        ),
    },
}

PAGE_CONTEXT_MAP: dict[str, str] = {
    "visitor-map": "visitor_flow",
    "visitor_flow": "visitor_flow",
    "visitor-flow": "visitor_flow",
    "local-economy": "economy_and_purchases",
    "economy": "economy_and_purchases",
    "economy-and-purchases": "economy_and_purchases",
    "comparison": "compare_matrix",
    "compare": "compare_matrix",
    "compare-matrix": "compare_matrix",
    "impact-ledger": "impact_ledger",
    "ledger": "impact_ledger",
    "authority": "deep_audits",
    "deep-audits": "deep_audits",
    "deep-audit": "deep_audits",
    "report-card": "impact_dashboard",
    "dashboard": "impact_dashboard",
    "environmental": "environmental_impact",
    "community": "community_benefits",
    "recommendations": "recommendations",
    "data-sources": "provenance",
    "landing": "ecotrace",
}


class ProjectKnowledge:
    """Authoritative Project Knowledge service for answering Level 1 conceptual questions."""

    @classmethod
    def get_definition(cls, key: str) -> dict[str, str] | None:
        return PROJECT_DEFINITIONS.get(key)

    @classmethod
    def resolve_concept_key(cls, text: str) -> str | None:
        t = text.lower().strip()
        # Direct key matches
        if any(k in t for k in ["visitor flow", "visitor-flow", "tourist flow", "visitor movement"]):
            return "visitor_flow"
        if any(k in t for k in ["compare matrix", "comparison matrix", "compare destinations", "comparison view"]):
            return "compare_matrix"
        if any(k in t for k in ["economy & purchases", "economy and purchases", "economy section", "purchases section", "local purchases"]):
            return "economy_and_purchases"
        if any(k in t for k in ["impact ledger", "the ledger", "audit ledger"]):
            return "impact_ledger"
        if any(k in t for k in ["deep audit", "deep audits", "authority dashboard", "authority view"]):
            return "deep_audits"
        if any(k in t for k in ["impact dashboard", "report card", "destination report card", "destination dashboard"]):
            return "impact_dashboard"
        if any(k in t for k in ["what can tourists do", "tourist choices"]):
            return "recommendations"
        if "recommendation" in t or "recommendations" in t:
            return "recommendations"
        if any(k in t for k in ["economic retention", "retention of tourism", "local revenue retention"]):
            return "economic_retention"
        if any(k in t for k in ["activity and tourism impact", "activity vs impact", "tourism impact", "impact of tourism"]):
            return "tourism_impact"
        if any(k in t for k in ["biodiversity", "wildlife variety", "species health"]):
            return "biodiversity"
        if any(k in t for k in ["environmental impact", "environmental health", "environment section"]):
            return "environmental_impact"
        if any(k in t for k in ["water quality", "water health", "why is water important", "water indicator"]):
            return "water"
        if any(k in t for k in ["fisheries", "fisherfolk", "fisher population", "fishing livelihood"]):
            return "fisheries"
        if any(k in t for k in ["community benefit", "community benefits", "why is community important", "local community"]):
            return "community_benefits"
        if any(k in t for k in ["data gap", "data gaps", "why do you show data gaps", "missing indicator"]):
            return "data_gap"
        if any(k in t for k in ["why do you need verified data", "verified data", "verification process", "is data verified", "verification"]):
            return "verification"
        if any(k in t for k in ["what is evidence", "grounding evidence"]) or t == "evidence":
            return "evidence"
        if any(k in t for k in ["what is a metric", "definition of metric", "indicator metric"]) or t == "metric":
            return "metric"
        if any(k in t for k in ["how does scoring work", "what is a score", "destination score", "scoring methodology"]) or t == "score":
            return "score"
        if any(k in t for k in ["confidence level", "what is confidence", "confidence rating"]):
            return "confidence"
        if any(k in t for k in ["provenance", "data provenance", "audit trail"]):
            return "provenance"
        if any(k in t for k in ["reportability", "candidate score", "reportable score"]):
            return "reportability"
        if any(k in t for k in ["purpose of ecotrace", "purpose of this website", "purpose of this platform", "what is ecotrace", "about ecotrace", "how does ecotrace work", "purpose of the website"]):
            return "ecotrace"
        if any(k in t for k in ["regenledger", "what is regenledger"]):
            return "regenledger"
        return None

    @classmethod
    def get_answer_for_query(
        cls,
        query: str,
        subject: str | None = None,
        page_id: str | None = None,
    ) -> tuple[str, str] | None:
        """
        Returns (answer_text, concept_key) or None.
        Handles definitions, work/purpose, importance, help, and page context.
        """
        q_lower = query.lower().strip()

        # 1. Resolve key
        key = None
        if subject:
            key = cls.resolve_concept_key(subject) or subject
        if not key:
            key = cls.resolve_concept_key(q_lower)

        # 2. If user is asking about current page (e.g. "what is this?", "what does this do?")
        if not key and page_id:
            p_clean = page_id.lower().replace("_", "-").strip()
            key = PAGE_CONTEXT_MAP.get(p_clean)

        if not key or key not in PROJECT_DEFINITIONS:
            return None

        concept = PROJECT_DEFINITIONS[key]

        # 3. Detect question intent style
        # Government help
        if any(k in q_lower for k in ["government", "authority", "authorities", "decision-maker", "officials"]):
            if "government_help" in concept:
                return (concept["government_help"], key)
            if "help" in concept:
                return (concept["help"], key)

        # Importance / Why
        if any(k in q_lower for k in ["why", "importance", "matter", "crucial", "necessary", "need"]):
            if "importance" in concept:
                return (concept["importance"], key)

        # Work / Purpose / Function / How it works
        if any(k in q_lower for k in ["work", "purpose", "function", "what does it do", "what does this do", "what do you do", "how does it work", "how does this work", "role"]):
            if "work" in concept:
                return (concept["work"], key)

        # Help / Benefit / How it helps
        if any(k in q_lower for k in ["help", "benefit", "assist", "useful", "value"]):
            if "help" in concept:
                return (concept["help"], key)

        # Default to definition
        return (concept["definition"], key)

    @classmethod
    def get_all_concepts_summary(cls) -> str:
        """Returns a concise summary of all Level 1 concepts for prompt injection."""
        lines = []
        for key, info in PROJECT_DEFINITIONS.items():
            lines.append(f"• {info['title']}: {info['definition']}")
        return "\n".join(lines)
