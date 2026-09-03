"""
Comprehensive Conversational Test Suite for EcoTrace AI Assistant.

Tests all 20 required user questions and multi-turn context resolutions:
1. What is Compare Matrix?
2. What is Economy & Purchases?
3. What is Impact Ledger?
4. What is Deep Audits?
5. What does 210 trained boatmen mean?
6. How many boatmen were trained?
7. Why is tourism important for the local economy?
8. What is the biodiversity situation?
9. Where does this data come from?
10. Is this data verified?
11. Why is this score like this?
12. What should we improve first?
13. Compare Chilika and Puri.
14. Tell me about Chilika.
15. What can tourists do?
16. What is the purpose of EcoTrace?
17. Why do you show data gaps?
18. What does this page do?
19. Why is community important?
20. What is the difference between tourism activity and tourism impact?

Plus Multi-turn Context Follow-ups:
- "How many boatmen were trained?" -> "Why is that important?"
- "What is Economy & Purchases?" -> "Why is that important?"
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


class TestAIConversationalSuite(unittest.TestCase):
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
        self.m_boat = MetricDefinition(id=1, code="trained_boatmen_count", name="Boatmen Trained in Safety & Skills", category="Community", unit="persons", direction=MetricDirection.HIGHER_IS_BETTER)
        self.m_water = MetricDefinition(id=2, code="water_dissolved_oxygen", name="Lake Dissolved Oxygen Level", category="Environment", unit="mg/L", direction=MetricDirection.HIGHER_IS_BETTER)
        self.m_cruise = MetricDefinition(id=3, code="cruise_vessels_count", name="Day Cruise Vessels Count", category="Tourism", unit="vessels", direction=MetricDirection.NEUTRAL)
        self.db.add_all([self.m_boat, self.m_water, self.m_cruise])
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
        self.obs_water = Observation(
            id=2,
            destination_id=44,
            metric_definition_id=2,
            dataset_id=1,
            normalized_value=7.8,
            original_value=7.8,
            period_start=datetime(2023, 4, 1, tzinfo=timezone.utc),
            period_end=datetime(2024, 3, 31, tzinfo=timezone.utc),
            status=ObservationStatus.VERIFIED,
            destination_specificity=DestinationSpecificity.DIRECT,
            confidence=ConfidenceLevel.HIGH,
        )
        self.db.add_all([self.obs_boat, self.obs_water])
        self.db.commit()

        self.service = AIAssistantService(self.db)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_q1_compare_matrix(self):
        req = AIAskRequest(destination_id=44, query="What is Compare Matrix?")
        res = self.service.ask(req)
        self.assertIn("Compare Matrix lets you compare two destinations", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0, "Conceptual questions must NOT attach metric cards")
        self.assertEqual(len(res.recommendations), 0, "Conceptual questions must NOT attach recommendations")
        self.assertNotIn("72.5", res.answer)

    def test_q2_economy_and_purchases(self):
        req = AIAskRequest(destination_id=44, query="What is Economy & Purchases?")
        res = self.service.ask(req)
        self.assertIn("Economy & Purchases focuses on the economic", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)
        self.assertEqual(len(res.recommendations), 0)

    def test_q3_impact_ledger(self):
        req = AIAskRequest(destination_id=44, query="What is Impact Ledger?")
        res = self.service.ask(req)
        self.assertIn("Impact Ledger is the central registry", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q4_deep_audits(self):
        req = AIAskRequest(destination_id=44, query="What is Deep Audits?")
        res = self.service.ask(req)
        self.assertIn("Deep Audits", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q5_boatmen_meaning(self):
        req = AIAskRequest(destination_id=44, query="What does 210 trained boatmen mean?")
        res = self.service.ask(req)
        self.assertIn("210 trained boatmen", res.answer)
        self.assertIn("capacity-building", res.answer)

    def test_q6_how_many_boatmen_were_trained(self):
        req = AIAskRequest(destination_id=44, query="How many boatmen were trained?")
        res = self.service.ask(req)
        self.assertIn("210 trained boatmen", res.answer)
        self.assertEqual(len(res.supporting_metrics), 1, "Only the 1 boatmen record should be returned")
        self.assertEqual(res.supporting_metrics[0].metric_code, "trained_boatmen_count")

    def test_q7_why_is_tourism_important_for_local_economy(self):
        req = AIAskRequest(destination_id=44, query="Why is tourism important for the local economy?")
        res = self.service.ask(req)
        self.assertIn("economic retention", res.answer)
        self.assertEqual(len(res.recommendations), 0)

    def test_q8_biodiversity_situation(self):
        req = AIAskRequest(destination_id=44, query="What is the biodiversity situation?")
        res = self.service.ask(req)
        self.assertIn("Biodiversity", res.answer)

    def test_q9_where_does_this_data_come_from(self):
        req = AIAskRequest(destination_id=44, query="Where does this data come from?")
        res = self.service.ask(req)
        self.assertIn("Chilika Development Authority", res.answer)

    def test_q10_is_this_data_verified(self):
        req = AIAskRequest(destination_id=44, query="Is this data verified?")
        res = self.service.ask(req)
        self.assertIn("statutory", res.answer)

    def test_q11_why_is_this_score_like_this(self):
        req = AIAskRequest(destination_id=44, query="Why is this score like this?")
        res = self.service.ask(req)
        self.assertIn("candidate destination impact score", res.answer.lower())

    def test_q12_what_should_we_improve_first(self):
        req = AIAskRequest(destination_id=44, query="What should we improve first?")
        res = self.service.ask(req)
        self.assertIn("first priority", res.answer.lower())
        self.assertGreaterEqual(len(res.recommendations), 1)

    def test_q13_compare_chilika_and_puri(self):
        req = AIAskRequest(destination_id=44, comparison_destination_id=103, query="Compare Chilika and Puri.")
        res = self.service.ask(req)
        self.assertIn("Comparative Matrix", res.answer)
        self.assertIn("Chilika Lake", res.answer)
        self.assertIn("Puri", res.answer)

    def test_q14_tell_me_about_chilika(self):
        req = AIAskRequest(destination_id=44, query="Tell me about Chilika.")
        res = self.service.ask(req)
        self.assertIn("Chilika Lake", res.answer)
        self.assertIn("brackish lagoon", res.answer.lower())

    def test_q15_what_can_tourists_do(self):
        req = AIAskRequest(destination_id=44, query="What can tourists do?")
        res = self.service.ask(req)
        self.assertIn("Tourists", res.answer)
        self.assertGreaterEqual(len(res.recommendations), 1)
        self.assertEqual(res.recommendations[0].action_type, "tourist_choice")

    def test_q16_purpose_of_ecotrace(self):
        req = AIAskRequest(destination_id=44, query="What is the purpose of EcoTrace?")
        res = self.service.ask(req)
        self.assertIn("EcoTrace is an evidence-based tourism impact platform", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q17_why_do_you_show_data_gaps(self):
        req = AIAskRequest(destination_id=44, query="Why do you show data gaps?")
        res = self.service.ask(req)
        self.assertIn("data gap", res.answer.lower())
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q18_what_does_this_page_do(self):
        req = AIAskRequest(
            destination_id=44,
            query="What does this page do?",
            context={"currentPage": "compare"}
        )
        res = self.service.ask(req)
        self.assertIn("Compare Matrix", res.answer)

    def test_q19_why_is_community_important(self):
        req = AIAskRequest(destination_id=44, query="Why is community important?")
        res = self.service.ask(req)
        self.assertIn("Local communities are the stewards", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_q20_difference_activity_vs_impact(self):
        req = AIAskRequest(destination_id=44, query="What is the difference between tourism activity and tourism impact?")
        res = self.service.ask(req)
        self.assertIn("Tourism activity measures volume", res.answer)
        self.assertIn("Tourism impact measures", res.answer)
        self.assertEqual(len(res.supporting_metrics), 0)

    def test_multiturn_followup_boatmen(self):
        # Turn 1
        req1 = AIAskRequest(destination_id=44, query="How many boatmen were trained?")
        res1 = self.service.ask(req1)
        self.assertIn("210 trained boatmen", res1.answer)

        # Turn 2: "Why is that important?"
        history = [
            {"role": "user", "content": req1.query},
            {"role": "assistant", "content": res1.answer},
        ]
        req2 = AIAskRequest(destination_id=44, query="Why is that important?", history=history)
        res2 = self.service.ask(req2)
        self.assertIn("capacity-building", res2.answer)
        self.assertNotIn("Chilika currently holds an overall destination impact score", res2.answer)

    def test_multiturn_followup_economy(self):
        # Turn 1
        req1 = AIAskRequest(destination_id=44, query="What is Economy & Purchases?")
        res1 = self.service.ask(req1)
        self.assertIn("Economy & Purchases", res1.answer)

        # Turn 2: "Why is that important?"
        history = [
            {"role": "user", "content": req1.query},
            {"role": "assistant", "content": res1.answer},
        ]
        req2 = AIAskRequest(destination_id=44, query="Why is that important?", history=history)
        res2 = self.service.ask(req2)
        self.assertIn("local purchases", res2.answer.lower())
        self.assertNotIn("72.5", res2.answer)


if __name__ == "__main__":
    unittest.main()
