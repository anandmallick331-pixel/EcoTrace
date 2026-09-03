"""
Automated Test Suite for EcoTrace AI — All 22 Exact Prompt Questions & Acceptance Criteria.

Verifies:
✓ Questions 1–15: Direct conceptual answers from project knowledge (0 metrics, 0 recs, 0 scores).
✓ Questions 16–18: Factual lookups with relevant verified records.
✓ Questions 19–22: Analytical synthesis with evidence and recommendations.
✓ Multi-turn context: "What is Visitor Flow?" -> "Why is it important?" -> "Can it help the government?"
✓ Page context sensitivity: "What is this?" on visitor-map, "What does this page do?" on local-economy.
✓ Negative data lookup: Specific indicator absence without the generic 6-domain defensive fallback.
"""

import unittest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.session import Base
from app.models.destination import Destination
from app.models.enums import ConfidenceLevel, DestinationSpecificity, ObservationStatus, MetricDirection
from app.models.metric import MetricDefinition
from app.models.observation import Observation
from app.models.source import Dataset, Source
from app.schemas.ai import AIAskRequest
from app.services.ai_assistant import AIAssistantService


class TestEcoTraceAI22Questions(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db: Session = self.SessionLocal()

        # Seed Chilika (44) and Puri (103)
        self.chilika = Destination(
            id=44,
            name="Chilika Lake",
            country_code="IND",
            region="Odisha",
            description="Brackish lagoon and wetland sanctuary",
        )
        self.puri = Destination(
            id=103,
            name="Puri",
            country_code="IND",
            region="Odisha",
            description="Coastal pilgrimage and heritage destination",
        )
        self.db.add_all([self.chilika, self.puri])

        # Seed Source & Dataset
        self.source = Source(
            id=1,
            name="Chilika Development Authority (CDA)",
            organisation="Government of Odisha",
            url="https://chilika.gov.in",
        )
        self.db.add(self.source)
        self.db.flush()

        self.dataset = Dataset(
            id=1,
            source_id=self.source.id,
            name="CDA Official Telemetry",
        )
        self.db.add(self.dataset)
        self.db.flush()

        # Seed metrics & observations
        self.m_boat = MetricDefinition(
            id=1,
            code="trained_boatmen_count",
            name="Boatmen Trained in Safety & Skills",
            category="Community",
            unit="persons",
            direction=MetricDirection.HIGHER_IS_BETTER
        )
        self.m_water = MetricDefinition(
            id=2,
            code="water_dissolved_oxygen",
            name="Lake Dissolved Oxygen Level",
            category="Environment",
            unit="mg/L",
            direction=MetricDirection.HIGHER_IS_BETTER
        )
        self.db.add_all([self.m_boat, self.m_water])
        self.db.flush()

        self.obs_boat = Observation(
            id=1,
            destination_id=44,
            metric_definition_id=1,
            dataset_id=1,
            normalized_value=210.0,
            original_value=210.0,
            period_start=datetime(2023, 4, 1, tzinfo=timezone.utc),
            period_end=datetime(2024, 3, 31, tzinfo=timezone.utc),
            status=ObservationStatus.VERIFIED,
            destination_specificity=DestinationSpecificity.DIRECT,
            confidence=ConfidenceLevel.HIGH,
        )
        self.db.add(self.obs_boat)
        self.db.commit()

        self.service = AIAssistantService(self.db)
        self.bad_fallback = "The available data covers tourism, biodiversity, environment, fisheries, water and community-related indicators."

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    # ──────────────────────────────────────────────────────────────────────────
    # QUESTIONS 1–15: Level 1 Conceptual Questions (Must answer directly, 0 cards)
    # ──────────────────────────────────────────────────────────────────────────

    def test_q01_what_is_visitor_flow(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is Visitor Flow?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Visitor Flow describes how tourists move through and concentrate within a destination", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0, "No metric cards for conceptual question")
        self.assertEqual(len(res.recommendations), 0, "No recommendations for conceptual question")

    def test_q02_what_is_the_work_of_visitor_flow(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is the work of Visitor Flow?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Visitor Flow helps show where and how tourism activity is distributed across a destination", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q03_why_is_visitor_flow_important(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="Why is Visitor Flow important?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("concentration of visitors can affect infrastructure", res.answer)
        self.assertIn("Tracking visitor flow helps identify where tourism pressure is highest", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q04_what_does_visitor_flow_do(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What does Visitor Flow do?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Visitor Flow helps show where and how tourism activity is distributed", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q05_how_does_visitor_flow_help(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="How does Visitor Flow help?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Visitor Flow helps show where and how tourism activity is distributed", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q06_what_is_compare_matrix(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is Compare Matrix?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Compare Matrix lets you compare two destinations", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)
        self.assertEqual(len(res.recommendations), 0)

    def test_q07_what_is_economy_and_purchases(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is Economy & Purchases?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Economy & Purchases focuses on the economic side of tourism", res.answer)
        self.assertIn("whether tourism revenue is genuinely retained in the local economy", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q08_what_is_impact_ledger(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is Impact Ledger?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Impact Ledger is the central registry", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q09_what_is_deep_audit(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is Deep Audit?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Deep Audits", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q10_what_is_a_data_gap(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is a data gap?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("data gap means the available evidence isn't sufficient", res.answer)
        self.assertIn("keeps it as a gap instead of filling it with an assumed value", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q11_why_do_you_need_verified_data(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="Why do you need verified data?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("report card is intended to reflect real conditions", res.answer)
        self.assertIn("Using verified sources makes the assessment traceable", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q12_what_is_tourism_impact(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is tourism impact?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Tourism impact refers to the effects tourism has on a destination's environment, economy and communities", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q13_what_is_economic_retention(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is economic retention?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Economic retention refers to the proportion of tourist expenditure that remains within the local destination economy", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q14_what_is_biodiversity(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is biodiversity?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Biodiversity represents the variety and health of living species and ecosystems", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q15_what_is_the_purpose_of_ecotrace(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What is the purpose of EcoTrace?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("EcoTrace is an evidence-based tourism impact platform", res.answer)
        self.assertIn("understand the impact of tourism on a destination", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # QUESTIONS 16–18: Level 2 Data & Provenance Lookups
    # ──────────────────────────────────────────────────────────────────────────

    def test_q16_how_many_boatmen_were_trained(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="How many boatmen were trained?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("210 trained boatmen", res.answer)
        self.assertEqual(len(res.supporting_metrics), 1, "Must attach exactly 1 relevant metric card")
        self.assertEqual(res.supporting_metrics[0].metric_code, "trained_boatmen_count")

    def test_q17_where_did_this_number_come_from(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="Where did this number come from?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Chilika Development Authority (CDA)", res.answer)

    def test_q18_is_this_data_verified(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="Is this data verified?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("verified", res.answer.lower())
        self.assertIn("Chilika Development Authority", res.answer)

    # ──────────────────────────────────────────────────────────────────────────
    # QUESTIONS 19–22: Level 3 Analytical & Comparative Queries
    # ──────────────────────────────────────────────────────────────────────────

    def test_q19_why_is_the_impact_score_like_this(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="Why is the impact score like this?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("candidate destination impact score", res.answer.lower())
        self.assertIn("/ 100", res.answer)

    def test_q20_what_should_we_improve_first(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="What should we improve first?"))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("first priority", res.answer.lower())
        self.assertGreaterEqual(len(res.recommendations), 1)

    def test_q21_compare_chilika_and_puri(self):
        res = self.service.ask(AIAskRequest(destination_id=44, comparison_destination_id=103, query="Compare Chilika and Puri."))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Comparative Matrix", res.answer)
        self.assertIn("Chilika Lake", res.answer)
        self.assertIn("Puri", res.answer)

    def test_q22_tell_me_about_chilika(self):
        res = self.service.ask(AIAskRequest(destination_id=44, query="Tell me about Chilika."))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Chilika Lake", res.answer)
        self.assertIn("Ramsar wetland", res.answer)

    # ──────────────────────────────────────────────────────────────────────────
    # MULTI-TURN CONVERSATIONS & FOLLOW-UPS
    # ──────────────────────────────────────────────────────────────────────────

    def test_multiturn_visitor_flow_chain(self):
        # Turn 1: "What is Visitor Flow?"
        req1 = AIAskRequest(destination_id=44, query="What is Visitor Flow?")
        res1 = self.service.ask(req1)
        self.assertIn("Visitor Flow describes how tourists move through and concentrate within a destination", res1.answer)

        # Turn 2: "Why is it important?"
        history_turn2 = [
            {"role": "user", "content": req1.query},
            {"role": "assistant", "content": res1.answer},
        ]
        req2 = AIAskRequest(destination_id=44, query="Why is it important?", history=history_turn2)
        res2 = self.service.ask(req2)
        self.assertIn("concentration of visitors can affect infrastructure", res2.answer)
        self.assertEqual(len(res2.supporting_metrics), 0)

        # Turn 3: "Can it help the government?"
        history_turn3 = history_turn2 + [
            {"role": "user", "content": req2.query},
            {"role": "assistant", "content": res2.answer},
        ]
        req3 = AIAskRequest(destination_id=44, query="Can it help the government?", history=history_turn3)
        res3 = self.service.ask(req3)
        self.assertIn("Yes. It can help destination managers and government authorities", res3.answer)
        self.assertEqual(len(res3.supporting_metrics), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # PAGE CONTEXT INQUIRIES
    # ──────────────────────────────────────────────────────────────────────────

    def test_page_context_visitor_map(self):
        res = self.service.ask(AIAskRequest(
            destination_id=44,
            query="What is this?",
            context={"currentPage": "visitor-map"}
        ))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Visitor Flow describes how tourists move through and concentrate within a destination", res.answer)

    def test_page_context_local_economy(self):
        res = self.service.ask(AIAskRequest(
            destination_id=44,
            query="What does this page do?",
            context={"currentPage": "local-economy"}
        ))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("Economy & Purchases focuses on the economic side of tourism", res.answer)

    # ──────────────────────────────────────────────────────────────────────────
    # MISSING DATA LOOKUP: NO DEFENSIVE GENERIC FALLBACK
    # ──────────────────────────────────────────────────────────────────────────

    def test_missing_data_specific_fallback(self):
        res = self.service.ask(AIAskRequest(
            destination_id=44,
            query="How many electric vehicle charging stations are recorded?"
        ))
        self.assertNotIn(self.bad_fallback, res.answer)
        self.assertIn("I don't have a verified record for that specific indicator", res.answer)


if __name__ == "__main__":
    unittest.main()
